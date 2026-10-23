# TLS and DNS observations: 2026-10-22

Commands (passive TLS handshake and name resolution only):

```bash
echo | openssl s_client -connect www.cynbit.in:443 -servername www.cynbit.in 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
echo | openssl s_client -connect cynbit.in:443 -servername cynbit.in 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
getent ahostsv4 www.cynbit.in
getent ahostsv4 cynbit.in
```

## www.cynbit.in

```
subject=CN = www.cynbit.in
issuer=C = US, O = Let's Encrypt, CN = YR2
notBefore=Sep 25 04:47:44 2026 GMT
notAfter=Dec 24 04:47:43 2026 GMT
X509v3 Subject Alternative Name:
    DNS:www.cynbit.in
```

Protocol/Cipher (separate handshake):

```
New, TLSv1.3, Cipher is TLS_AES_128_GCM_SHA256
Verify return code: 0 (ok)
```

## cynbit.in

```
subject=CN = cynbit.in
issuer=C = US, O = Let's Encrypt, CN = YR2
notBefore=Sep 26 16:19:30 2026 GMT
notAfter=Dec 25 16:19:29 2026 GMT
X509v3 Subject Alternative Name:
    DNS:cynbit.in
```

`-verify_return_error` result:

```
Verify return code: 0 (ok)
```

## DNS (A records returned by the resolver)

```
www.cynbit.in -> 216.198.79.65, 64.29.17.65
cynbit.in     -> 216.198.79.1
```

No port scan or service enumeration was performed. TLS was tested only on 443; one plain HTTP request to port 80 was made separately to confirm the redirect.

No personal data is included. Public business email addresses and phone numbers in other captures were replaced with equal-length placeholders; the published office address remains because it is public business information. See [`notes/raw-observations.md`](../../notes/raw-observations.md#redaction-note).
