/**
 * Sanity checks for src/lib/calc/* and the default grade scale.
 * Run with:  npm run check:calcs
 *
 * Includes the worked example from the build plan:
 *   3 CH of A (4.00) + 3 CH of B- (2.67) + 4 CH of C+ (2.33) = 2.93
 */

import { DEFAULT_GRADE_SCALE, gradePointsFor } from "../src/lib/grading";
import { combineTotals, sumCourses } from "../src/lib/calc/gpa";
import { calcRequiredFinal } from "../src/lib/calc/grade";
import { calcCourseTotal, calcWeightedAverage } from "../src/lib/calc/weighted";
import { calcRequiredAverageGpa } from "../src/lib/calc/improvement";
import { calcAttendance } from "../src/lib/calc/attendance";

let failures = 0;

function expect(name: string, actual: unknown, expected: unknown) {
  const ok =
    Object.is(actual, expected) ||
    (typeof actual === "number" &&
      typeof expected === "number" &&
      Math.abs(actual - expected) < 1e-9);
  if (ok) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name} -> expected ${expected}, got ${actual}`);
  }
}

console.log("grade scale");
expect("B- maps to 2.67", gradePointsFor(DEFAULT_GRADE_SCALE, "B-"), 2.67);
expect("A maps to 4.00", gradePointsFor(DEFAULT_GRADE_SCALE, "A"), 4);
expect("unknown letter is null", gradePointsFor(DEFAULT_GRADE_SCALE, "Z"), null);

console.log("\ngpa / sgpa / cgpa");
const worked = sumCourses([
  { creditHours: 3, gradePoints: 4.0 },
  { creditHours: 3, gradePoints: 2.67 },
  { creditHours: 4, gradePoints: 2.33 },
]);
expect("worked example credits", worked.credits, 10);
expect("worked example quality points", worked.qualityPoints, 29.33);
expect("worked example gpa = 2.93", worked.gpa, 2.93);

expect("zero credits ignored", sumCourses([{ creditHours: 0, gradePoints: 4 }]).gpa, null);
expect(
  "NaN grade ignored",
  sumCourses([{ creditHours: 3, gradePoints: Number.NaN }]).gpa,
  null
);
expect(
  "negative credits ignored",
  sumCourses([{ creditHours: -3, gradePoints: 4 }]).gpa,
  null
);

const combined = combineTotals(
  { credits: 30, qualityPoints: 90, gpa: 3 },
  { credits: 10, qualityPoints: 40, gpa: 4 }
);
expect("combined cgpa = 3.25", combined.gpa, 3.25);

console.log("\nrequired final score");
const feasible = calcRequiredFinal({
  currentScorePct: 70,
  weightCompletedPct: 60,
  targetPct: 80,
});
expect("feasible case requires 95%", feasible.requiredScorePct, 95);
expect("feasible case is feasible", feasible.feasible, true);
const infeasible = calcRequiredFinal({
  currentScorePct: 70,
  weightCompletedPct: 60,
  targetPct: 90,
});
expect("infeasible case requires 120%", infeasible.requiredScorePct, 120);
expect("infeasible case is not feasible", infeasible.feasible, false);
const secured = calcRequiredFinal({
  currentScorePct: 90,
  weightCompletedPct: 60,
  targetPct: 80,
});
expect("secured case requires 65%", secured.requiredScorePct, 65);
expect(
  "fully secured case flags alreadySecured",
  calcRequiredFinal({ currentScorePct: 90, weightCompletedPct: 60, targetPct: 50 })
    .alreadySecured,
  true
);
expect(
  "fully secured case requires 0%",
  calcRequiredFinal({ currentScorePct: 90, weightCompletedPct: 60, targetPct: 50 })
    .requiredScorePct,
  0
);
expect(
  "invalid weights rejected",
  calcRequiredFinal({ currentScorePct: 70, weightCompletedPct: 100, targetPct: 80 })
    .valid,
  false
);

console.log("\ncourse total + weighted average");
const course = calcCourseTotal([
  { pointsEarned: 18, pointsTotal: 20, weightPct: 30 },
  { pointsEarned: 45, pointsTotal: 50, weightPct: 20 },
  { pointsEarned: 70, pointsTotal: 100, weightPct: 50 },
]);
expect("course total = 80%", course.totalPct, 80);
expect("course total weight = 100", course.weightSum, 100);
expect("course total valid", course.valid, true);

const partial = calcCourseTotal([{ pointsEarned: 10, pointsTotal: 10, weightPct: 40 }]);
expect("partial weight flagged invalid", partial.valid, false);
expect("partial total still shown", partial.totalPct, 40);

expect(
  "weighted average = 70",
  calcWeightedAverage([
    { value: 60, weight: 25 },
    { value: 80, weight: 25 },
    { value: 70, weight: 50 },
  ]).average,
  70
);

console.log("\ncgpa improvement");
const plan = calcRequiredAverageGpa({
  currentCgpa: 2.5,
  creditsCompleted: 60,
  targetCgpa: 3.0,
  remainingCredits: 60,
});
expect("required average = 3.5", plan.requiredGpa, 3.5);
expect("plan is achievable", plan.achievable, true);
const stretch = calcRequiredAverageGpa({
  currentCgpa: 2.5,
  creditsCompleted: 60,
  targetCgpa: 3.9,
  remainingCredits: 60,
});
expect("stretch target not achievable", stretch.achievable, false);
expect("stretch max possible = 3.25", stretch.maxPossibleCgpa, 3.25);

console.log("\nattendance");
const safe = calcAttendance({
  classesHeld: 30,
  classesAttended: 27,
  requiredPct: 80,
});
expect("current attendance = 90%", safe.currentPct, 90);
expect("can miss 3 classes", safe.canMiss, 3);
const behind = calcAttendance({
  classesHeld: 30,
  classesAttended: 22,
  requiredPct: 80,
});
expect("must attend 10 classes to recover", behind.mustAttend, 10);
expect(
  "invalid attendance rejected",
  calcAttendance({ classesHeld: 10, classesAttended: 11, requiredPct: 80 }).valid,
  false
);

console.log(
  failures === 0
    ? "\nAll calc checks passed."
    : `\n${failures} calc check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
