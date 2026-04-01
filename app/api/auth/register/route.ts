import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase.server";

function isValidGradeLevel(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 12;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, grade } = await req.json();

    if (!email || !password || grade == null) {
      return NextResponse.json(
        { error: "email, password, and grade are required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (!isValidGradeLevel(grade)) {
      return NextResponse.json(
        { error: "grade must be an integer between 1 and 12." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create Supabase Auth user (auto-confirms email)
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({ email, password, email_confirm: true });

    if (authError) {
      if (authError.message.toLowerCase().includes("already registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }
      console.error("[register] Auth user creation failed:", authError);
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create the app User record via Prisma (rollback auth user on failure)
    try {
      await prisma.user.create({ data: { id: userId, email, grade } });
    } catch (dbError) {
      console.error("[register] DB insert failed, rolling back auth user:", dbError);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create user profile. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Account created successfully." },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register] Unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
