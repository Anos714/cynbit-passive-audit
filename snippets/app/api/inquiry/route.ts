// snippets/app/api/inquiry/route.ts
// Reference POST endpoint that combines:
//   - strict schema validation
//   - rate limiting with 429 + Retry-After
//   - a correlation-ID error envelope
//
// This is a reference implementation. The live site currently posts through a
// Next.js Server Action; if you keep that design, call the same rateLimit(),
// parseInquiry(), and jsonError() helpers from the action instead.
//
// Place lib/rate-limit.ts, lib/inquiry-schema.ts, and lib/errors.ts in the
// application's lib/ directory. The @/ alias is the standard Next.js one.

import { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { parseInquiry } from '@/lib/inquiry-schema';
import { jsonError, newCorrelationId } from '@/lib/errors';

export async function POST(request: NextRequest) {
  const correlationId = newCorrelationId();

  // On Vercel, x-real-ip is set by the platform. Do not trust a client-supplied
  // X-Forwarded-For value unless your proxy overwrites it.
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

  if (!ip) {
    return jsonError({
      code: 'VALIDATION_ERROR',
      message: 'Could not determine client address',
      status: 400,
      correlationId,
    });
  }

  try {
    const limit = await rateLimit(`inquiry:${ip}`, 5, 600);
    if (!limit.ok) {
      return jsonError({
        code: 'RATE_LIMITED',
        message: 'Too many inquiries from this address. Try again shortly.',
        status: 429,
        correlationId,
        retryAfter: limit.retryAfter,
      });
    }

    const contentType = request.headers.get('content-type') ?? '';
    if (
      !contentType.includes('multipart/form-data') &&
      !contentType.includes('application/x-www-form-urlencoded')
    ) {
      return jsonError({
        code: 'VALIDATION_ERROR',
        message: 'Unsupported content type',
        status: 415,
        correlationId,
      });
    }

    const formData = await request.formData();
    const parsed = parseInquiry(formData);

    if (!parsed.success) {
      return jsonError({
        code: 'VALIDATION_ERROR',
        message: 'Check the highlighted fields and try again.',
        status: 422,
        correlationId,
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    // Replace this comment with the actual CRM/email delivery call. Do not log
    // parsed.data: it contains personal data.
    //
    // await crm.createLead({ ...parsed.data, correlationId });

    return Response.json(
      { ok: true, correlationId },
      {
        status: 202,
        headers: {
          'cache-control': 'no-store',
          'x-correlation-id': correlationId,
        },
      },
    );
  } catch (error) {
    // Log only the correlation ID and error class. Do not log the payload.
    console.error(
      JSON.stringify({
        level: 'error',
        correlationId,
        error: error instanceof Error ? error.name : 'unknown',
      }),
    );

    return jsonError({
      code: 'INTERNAL',
      message: 'The inquiry could not be accepted.',
      status: 500,
      correlationId,
    });
  }
}
