export default function UML() {
  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <h1 className="text-white text-2xl font-bold text-center mb-8 font-mono">TutorFlow — Data Model</h1>
      <div className="flex justify-center overflow-x-auto">
        <svg viewBox="0 0 1020 460" width="1020" height="460" fontFamily="monospace" fontSize="11">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
            </marker>
            <marker id="arrow-purple" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
            </marker>
          </defs>

          {/* ── Relations (drawn behind boxes) ── */}

          {/* User → Subject */}
          <line x1="220" y1="102" x2="288" y2="97" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* Subject → Material */}
          <line x1="470" y1="97" x2="538" y2="107" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* Material → MaterialType (dashed, enum reference) */}
          <line x1="725" y1="107" x2="798" y2="93" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrow-purple)" />

          {/* User → UploadedFile */}
          <line x1="130" y1="165" x2="130" y2="298" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* Subject → UploadedFile */}
          <path d="M380,155 L380,210 L215,210 L215,298" stroke="#6b7280" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />

          {/* Material → Flashcard */}
          <path d="M590,180 L590,240 L380,240 L380,298" stroke="#6b7280" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />

          {/* Material → TestQuestion */}
          <line x1="635" y1="180" x2="640" y2="298" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* Material → TestAttempt */}
          <path d="M725,155 L760,155 L760,250 L892,250 L892,298" stroke="#6b7280" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />

          {/* ── Boxes ── */}

          {/* User */}
          <rect x="40" y="40" width="180" height="125" fill="#1f2937" stroke="#6b7280" />
          <rect x="40" y="40" width="180" height="26" fill="#374151" />
          <text x="130" y="57" textAnchor="middle" fill="white" fontWeight="bold" fontSize="12">User</text>
          <line x1="40" y1="66" x2="220" y2="66" stroke="#6b7280" />
          <text x="55" y="83" fill="#fbbf24">PK </text><text x="78" y="83" fill="#d1d5db">id: String</text>
          <text x="55" y="99" fill="#d1d5db">email: String</text>
          <text x="55" y="115" fill="#d1d5db">gradeLevel: Int</text>
          <text x="55" y="131" fill="#d1d5db">createdAt: DateTime</text>
          <text x="55" y="155" fill="#d1d5db">passwordHash: String</text>

          {/* Subject */}
          <rect x="290" y="40" width="180" height="115" fill="#1f2937" stroke="#6b7280" />
          <rect x="290" y="40" width="180" height="26" fill="#374151" />
          <text x="380" y="57" textAnchor="middle" fill="white" fontWeight="bold" fontSize="12">Subject</text>
          <line x1="290" y1="66" x2="470" y2="66" stroke="#6b7280" />
          <text x="305" y="83" fill="#fbbf24">PK </text><text x="328" y="83" fill="#d1d5db">id: String</text>
          <text x="305" y="99" fill="#60a5fa">FK </text><text x="328" y="99" fill="#d1d5db">userId: String</text>
          <text x="305" y="115" fill="#d1d5db">name: String</text>
          <text x="305" y="131" fill="#d1d5db">createdAt: DateTime</text>

          {/* Material */}
          <rect x="540" y="40" width="185" height="140" fill="#1f2937" stroke="#6b7280" />
          <rect x="540" y="40" width="185" height="26" fill="#374151" />
          <text x="632" y="57" textAnchor="middle" fill="white" fontWeight="bold" fontSize="12">Material</text>
          <line x1="540" y1="66" x2="725" y2="66" stroke="#6b7280" />
          <text x="555" y="83" fill="#fbbf24">PK </text><text x="578" y="83" fill="#d1d5db">id: String</text>
          <text x="555" y="99" fill="#60a5fa">FK </text><text x="578" y="99" fill="#d1d5db">subjectId: String</text>
          <text x="555" y="115" fill="#d1d5db">topic: String</text>
          <text x="555" y="131" fill="#d1d5db">type: MaterialType</text>
          <text x="555" y="147" fill="#d1d5db">content: Json</text>
          <text x="555" y="163" fill="#d1d5db">createdAt: DateTime</text>

          {/* MaterialType enum */}
          <rect x="800" y="40" width="175" height="110" fill="#1f2937" stroke="#a855f7" strokeDasharray="5,3" />
          <rect x="800" y="40" width="175" height="26" fill="#3b1f63" />
          <text x="887" y="50" textAnchor="middle" fill="#a855f7" fontSize="9">«enum»</text>
          <text x="887" y="63" textAnchor="middle" fill="white" fontWeight="bold" fontSize="12">MaterialType</text>
          <line x1="800" y1="66" x2="975" y2="66" stroke="#a855f7" />
          <text x="815" y="83" fill="#d1d5db">SUMMARY</text>
          <text x="815" y="99" fill="#d1d5db">FLASHCARD</text>
          <text x="815" y="115" fill="#d1d5db">TEST</text>

          {/* UploadedFile */}
          <rect x="40" y="300" width="190" height="135" fill="#1f2937" stroke="#6b7280" />
          <rect x="40" y="300" width="190" height="26" fill="#374151" />
          <text x="135" y="317" textAnchor="middle" fill="white" fontWeight="bold" fontSize="12">UploadedFile</text>
          <line x1="40" y1="326" x2="230" y2="326" stroke="#6b7280" />
          <text x="55" y="343" fill="#fbbf24">PK </text><text x="78" y="343" fill="#d1d5db">id: String</text>
          <text x="55" y="359" fill="#60a5fa">FK </text><text x="78" y="359" fill="#d1d5db">userId: String</text>
          <text x="55" y="375" fill="#60a5fa">FK </text><text x="78" y="375" fill="#d1d5db">subjectId: String?</text>
          <text x="55" y="391" fill="#d1d5db">url: String</text>
          <text x="55" y="407" fill="#d1d5db">fileType: String</text>
          <text x="55" y="423" fill="#d1d5db">createdAt: DateTime</text>

          {/* Flashcard */}
          <rect x="290" y="300" width="180" height="110" fill="#1f2937" stroke="#6b7280" />
          <rect x="290" y="300" width="180" height="26" fill="#374151" />
          <text x="380" y="317" textAnchor="middle" fill="white" fontWeight="bold" fontSize="12">Flashcard</text>
          <line x1="290" y1="326" x2="470" y2="326" stroke="#6b7280" />
          <text x="305" y="343" fill="#fbbf24">PK </text><text x="328" y="343" fill="#d1d5db">id: String</text>
          <text x="305" y="359" fill="#60a5fa">FK </text><text x="328" y="359" fill="#d1d5db">materialId: String</text>
          <text x="305" y="375" fill="#d1d5db">front: String</text>
          <text x="305" y="391" fill="#d1d5db">back: String</text>

          {/* TestQuestion */}
          <rect x="540" y="300" width="200" height="145" fill="#1f2937" stroke="#6b7280" />
          <rect x="540" y="300" width="200" height="26" fill="#374151" />
          <text x="640" y="317" textAnchor="middle" fill="white" fontWeight="bold" fontSize="12">TestQuestion</text>
          <line x1="540" y1="326" x2="740" y2="326" stroke="#6b7280" />
          <text x="555" y="343" fill="#fbbf24">PK </text><text x="578" y="343" fill="#d1d5db">id: String</text>
          <text x="555" y="359" fill="#60a5fa">FK </text><text x="578" y="359" fill="#d1d5db">materialId: String</text>
          <text x="555" y="375" fill="#d1d5db">question: String</text>
          <text x="555" y="391" fill="#d1d5db">options: String[]</text>
          <text x="555" y="407" fill="#d1d5db">correctAnswer: String</text>
          <text x="555" y="423" fill="#d1d5db">explanation: String?</text>

          {/* TestAttempt */}
          <rect x="800" y="300" width="185" height="130" fill="#1f2937" stroke="#6b7280" />
          <rect x="800" y="300" width="185" height="26" fill="#374151" />
          <text x="892" y="317" textAnchor="middle" fill="white" fontWeight="bold" fontSize="12">TestAttempt</text>
          <line x1="800" y1="326" x2="985" y2="326" stroke="#6b7280" />
          <text x="815" y="343" fill="#fbbf24">PK </text><text x="838" y="343" fill="#d1d5db">id: String</text>
          <text x="815" y="359" fill="#60a5fa">FK </text><text x="838" y="359" fill="#d1d5db">materialId: String</text>
          <text x="815" y="375" fill="#d1d5db">score: Int</text>
          <text x="815" y="391" fill="#d1d5db">answers: Json</text>
          <text x="815" y="407" fill="#d1d5db">completedAt: DateTime</text>
        </svg>
      </div>
    </div>
  );
}
