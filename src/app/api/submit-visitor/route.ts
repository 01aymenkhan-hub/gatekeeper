import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      visitInfo,
      documentType,
      documentData,
      phoneNumber,
      visitorCardNo,
      visitorPhotoPreview,
    } = body;

    if (!documentType || !documentData) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing document information in submission payload.",
        },
        { status: 400 }
      );
    }

    // Generate unique registration record ID
    const recordId = `VIS-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

    const timestamp = new Date().toISOString();

    console.log(
      `[Visitor Submission] New visitor registered: ${recordId} - Card No: ${
        visitorCardNo || "N/A"
      } - Host: ${visitInfo?.meetName || "N/A"} (${visitInfo?.department || "N/A"}) - Doc: ${documentType} - Phone: ${
        phoneNumber || "N/A"
      } - Photo attached: ${Boolean(visitorPhotoPreview)}`
    );

    return NextResponse.json({
      success: true,
      message: "Visitor record submitted successfully.",
      recordId,
      visitorCardNo: visitorCardNo || "",
      submittedAt: timestamp,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing visitor submission:", message);
    return NextResponse.json(
      {
        success: false,
        error: `Submission failed: ${message}`,
      },
      { status: 500 }
    );
  }
}
