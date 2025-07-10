// app/api/monthly_cra_reports/[id]/route.js
import { NextResponse } from "next/server";
import {
  getMonthlyReportByIdController,
  updateMonthlyReportStatusController,
} from "../controller"; // Importez les fonctions du contrôleur

export async function GET(request, { params }) {
  const { id } = params; // <-- CHANGEMENT ICI : reportId devient id

  if (!id) {
    return NextResponse.json(
      { message: "Report ID is required" },
      { status: 400 }
    );
  }

  try {
    const report = await getMonthlyReportByIdController(id); // <-- PASSE id

    if (!report) {
      return NextResponse.json(
        { message: "Monthly report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error(`API Error /api/monthly_cra_reports/${id} (GET):`, error);
    return NextResponse.json(
      { message: error.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const { id } = params; // <-- CHANGEMENT ICI : reportId devient id
  const { status, reviewerId, rejectionReason } = await request.json();

  if (!id) {
    return NextResponse.json(
      { message: "Report ID is required" },
      { status: 400 }
    );
  }
  if (!status || !["validated", "rejected"].includes(status)) {
    return NextResponse.json(
      { message: "Invalid status provided" },
      { status: 400 }
    );
  }
  if (
    status === "rejected" &&
    (!rejectionReason || rejectionReason.trim() === "")
  ) {
    return NextResponse.json(
      { message: "Rejection reason is required for rejected status" },
      { status: 400 }
    );
  }

  try {
    const updatedReport = await updateMonthlyReportStatusController(
      id, // <-- PASSE id
      status,
      reviewerId,
      rejectionReason
    );
    return NextResponse.json(updatedReport, { status: 200 });
  } catch (error) {
    console.error(`API Error /api/monthly_cra_reports/${id} (PUT):`, error);
    return NextResponse.json(
      { message: error.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
