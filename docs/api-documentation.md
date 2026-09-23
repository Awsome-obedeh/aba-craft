# Swagger API documentation

Start the app with `npm run dev`, then open:

- **Swagger UI:** http://localhost:3000/api-docs
- **OpenAPI JSON:** http://localhost:3000/api/openapi

Use the port printed by Next.js if it chooses another one. In deployment, both paths use the deployed site's origin. Swagger's API server URL is `/api`, so requests do not depend on `NEXT_PUBLIC_API_URL`.

The specification documents all eight existing API endpoints outside `/api/test`, plus its own JSON download endpoint. It describes parameters, request schemas, multipart upload fields, response schemas and examples, validation errors, authentication and the signup sequence. No `/api/test` operations are included.

## Try the signup flow

1. Expand **Email verification → Send an email verification code**. Click **Try it out**, enter a test email you control and click **Execute**.
2. Enter the received code in **Verify an email code**. Copy the returned `verificationToken`.
3. Expand **Registration → Register a seller or customer** and choose **multipart/form-data**. The `account` and `business` fields contain JSON strings. Edit the examples, paste your verification token, provide the BVN and select a CAC file. Execute to submit everything together.
4. Use **Authentication → Sign in**. Copy `accessToken` and paste it into **Authorize → bearerAuth**, without a `Bearer` prefix.
5. To request a private CAC URL, use **Documents → Get a private CAC download URL** with the business's ID, not its owner's user ID. The current signup response does not return a business ID; obtain it from your business record.

Requests from Swagger execute the real endpoints and can send email, store files and create accounts. Examples are synthetic; use test accounts and documents for testing. Swagger does not automatically send requests on page load.

The customer flow uses the same signup operation with **application/json** and `role: customer`. See the operation's description for verification and mail-failure behavior.

## Tokens and cookies

Protected document requests use the Bearer access token. The refresh endpoint instead uses the HttpOnly `refreshToken` cookie set by sign-in. Sign in through Swagger on the same origin first; the browser sends the cookie automatically. Swagger cannot manually set an HttpOnly cookie. The refresh response contains the new access token, which can be copied back into Authorize.

Authorization is kept in memory only. Reloading the docs clears Swagger's Bearer authorization. Logout clears the refresh cookie but does not revoke an existing access token; clear the token in Swagger's Authorize dialog too. The UI uses the locally installed `swagger-ui-react` package and disables the remote Swagger validation service.

## Maintain the documentation

- `src/app/lib/openapi.js` is the single specification source.
- `src/app/api/openapi/route.js` serves it as JSON without importing database or storage code.
- `src/app/api-docs/SwaggerDocs.jsx` loads Swagger UI in the browser.
- `scripts/openapi.test.mjs` validates the OpenAPI document and checks route coverage, excluding the test directory.

Run `npm run test:openapi` after changing an endpoint. Update the specification alongside any request/response changes. Download `/api/openapi` to import the document into Postman, Swagger Editor, or another OpenAPI-compatible tool.

For database, SMTP, Cloudinary and encryption configuration, see [signup-api-contract.md](signup-api-contract.md).

References: [Swagger UI React](https://github.com/swagger-api/swagger-ui/tree/main/flavors/swagger-ui-react), [OpenAPI multipart requests](https://swagger.io/docs/specification/v3_0/describing-request-body/multipart-requests/).
