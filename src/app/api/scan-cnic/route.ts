import { NextRequest, NextResponse } from "next/server";

// FastAPI OCR backend URL on the local host
const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

/**
 * Server-side proxy for the FastAPI CNIC OCR endpoint.
 *
 * Forwards multipart/form-data image uploads from the browser (or mobile device via ngrok)
 * to the internal FastAPI backend running on http://127.0.0.1:8000.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided in request." },
        { status: 400 }
      );
    }

    // Forward the file to FastAPI
    const backendFormData = new FormData();
    backendFormData.append("file", file);

    const backendRes = await fetch(`${FASTAPI_URL}/scan-cnic`, {
      method: "POST",
      body: backendFormData,
    });

    if (!backendRes.ok) {
      const errorText = await backendRes.text();
      return NextResponse.json(
        {
          success: false,
          error: `FastAPI OCR error (${backendRes.status}): ${errorText}`,
        },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Next.js OCR proxy error:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: `OCR proxy failed: ${errorMessage}. Make sure FastAPI is running on http://127.0.0.1:8000.`,
      },
      { status: 500 }
    );
  }
}
