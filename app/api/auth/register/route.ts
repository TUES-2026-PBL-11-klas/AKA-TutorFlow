import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key bypasses RLS for server-side user creation
);

interface RegisterRequestBody {
  email: string;
  password: string;
  gradeLevel: number; // Integer 1-12
}

/** gradeLevel must be a whole integer between 1 and 12 inclusive. */
function validateGradeLevel(gradeLevel: unknown): gradeLevel is number {
  return (
    typeof gradeLevel === "number" &&
    Number.isInteger(gradeLevel) &&
    gradeLevel >= 1 &&
    gradeLevel <= 12
  );
}

export async function POST(req: NextRequest) {
  try {
    const body: RegisterRequestBody = await req.json();
    const { email, password, gradeLevel } = body;

    // --- Validation ---
    if (!email || !password || gradeLevel == null) {
      return NextResponse.json(
        { error: "email, password, and gradeLevel are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (!validateGradeLevel(gradeLevel)) {
      return NextResponse.json(
        { error: "Invalid gradeLevel. Must be an integer between 1 and 12." },
        { status: 400 }
      );
    }

    // --- Create Supabase Auth user ---
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email; set to false to require email verification
      });

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

    // --- Create corresponding User record in the database ---
    const { data: userRecord, error: dbError } = await supabase
      .from("users")
      .insert({
        id: userId, // Foreign key linked to auth.users.id
        email,
        grade_level: gradeLevel,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete the auth user if the DB insert fails to avoid orphaned auth records
      console.error(
        "[register] DB insert failed, rolling back auth user:",
        dbError
      );
      await supabase.auth.admin.deleteUser(userId);

      return NextResponse.json(
        { error: "Failed to create user profile. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: {
          id: userRecord.id,
          email: userRecord.email,
          gradeLevel: userRecord.grade_level,
          createdAt: userRecord.created_at,
        },
      },
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
