// Retired: this route previously signed arbitrary unauthenticated uploads.
export async function POST() {
  return Response.json({ success: false, message: "This upload-signing endpoint has been retired. Submit CAC documents with /api/auth/sign-up." }, { status: 410 });
}
