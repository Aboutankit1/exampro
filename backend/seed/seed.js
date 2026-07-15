import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Institute from "../models/Institute.js";
import Subject from "../models/Subject.js";
import Question from "../models/Question.js";
import Exam from "../models/Exam.js";

dotenv.config();

const run = async () => {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany(),
    Institute.deleteMany(),
    Subject.deleteMany(),
    Question.deleteMany(),
    Exam.deleteMany(),
  ]);

  console.log("Creating super admin...");
  const superAdmin = await User.create({
    name: "Super Admin",
    email: "superadmin@cbtportal.com",
    password: "Password123",
    role: "superadmin",
  });

  console.log("Creating demo institute...");
  const institute = await Institute.create({
    name: "Everest Learning Institute",
    code: "EVEREST",
    email: "admin@everest.edu",
    plan: "pro",
    approvalStatus: "approved",
  });

  const instituteAdmin = await User.create({
    name: "Institute Admin",
    email: "admin@everest.edu",
    password: "Password123",
    role: "instituteadmin",
    institute: institute._id,
  });
  institute.admin = instituteAdmin._id;
  await institute.save();

  const teacher = await User.create({
    name: "Ms. Priya Sharma",
    email: "teacher@everest.edu",
    password: "Password123",
    role: "teacher",
    institute: institute._id,
  });

  const students = await User.insertMany([
    {
      name: "Aarav Mehta",
      email: "student1@everest.edu",
      password: "Password123",
      role: "student",
      institute: institute._id,
      batch: "2026-A",
    },
    {
      name: "Diya Kapoor",
      email: "student2@everest.edu",
      password: "Password123",
      role: "student",
      institute: institute._id,
      batch: "2026-A",
    },
  ]);

  console.log("Creating subjects...");
  const subject = await Subject.create({
    name: "General Science",
    code: "SCI101",
    institute: institute._id,
    topics: ["Physics", "Chemistry", "Biology"],
    createdBy: teacher._id,
  });

  console.log("Creating questions...");
  const questions = await Question.insertMany([
    {
      institute: institute._id,
      subject: subject._id,
      topic: "Physics",
      type: "mcq",
      questionText: "What is the SI unit of force?",
      difficulty: "easy",
      marks: 2,
      negativeMarks: 0.5,
      options: [
        { text: "Newton", isCorrect: true },
        { text: "Joule", isCorrect: false },
        { text: "Watt", isCorrect: false },
        { text: "Pascal", isCorrect: false },
      ],
      explanation: "Force is measured in Newtons (N), named after Sir Isaac Newton.",
      createdBy: teacher._id,
    },
    {
      institute: institute._id,
      subject: subject._id,
      topic: "Chemistry",
      type: "multi_correct",
      questionText: "Which of the following are noble gases?",
      difficulty: "medium",
      marks: 3,
      negativeMarks: 1,
      options: [
        { text: "Helium", isCorrect: true },
        { text: "Neon", isCorrect: true },
        { text: "Oxygen", isCorrect: false },
        { text: "Argon", isCorrect: true },
      ],
      explanation: "Helium, Neon, and Argon are noble gases; Oxygen is not.",
      createdBy: teacher._id,
    },
    {
      institute: institute._id,
      subject: subject._id,
      topic: "Biology",
      type: "true_false",
      questionText: "The human heart has four chambers.",
      difficulty: "easy",
      marks: 1,
      negativeMarks: 0,
      options: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ],
      createdBy: teacher._id,
    },
    {
      institute: institute._id,
      subject: subject._id,
      topic: "Physics",
      type: "numerical",
      questionText: "Calculate the value of acceleration due to gravity (in m/s^2), rounded to nearest whole number.",
      difficulty: "medium",
      marks: 2,
      negativeMarks: 0,
      correctNumericAnswer: 10,
      numericTolerance: 0,
      createdBy: teacher._id,
    },
    {
      institute: institute._id,
      subject: subject._id,
      topic: "Chemistry",
      type: "fill_blank",
      questionText: "The chemical symbol for Sodium is ____.",
      difficulty: "easy",
      marks: 1,
      negativeMarks: 0,
      correctTextAnswer: "Na",
      createdBy: teacher._id,
    },
  ]);

  console.log("Creating a live demo exam...");
  const now = new Date();
  const exam = await Exam.create({
    institute: institute._id,
    title: "General Science - Unit Test 1",
    description: "Covers basic Physics, Chemistry, and Biology concepts.",
    subject: subject._id,
    instructions: "Read each question carefully. Negative marking applies. Do not switch tabs.",
    durationMinutes: 30,
    totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
    passingMarks: 5,
    questions: questions.map((q) => q._id),
    totalQuestions: questions.length,
    randomizeQuestions: true,
    randomizeOptions: true,
    negativeMarking: true,
    startDate: new Date(now.getTime() - 60 * 60 * 1000), // started 1hr ago
    endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // ends in 24hrs
    maxAttempts: 2,
    batches: ["2026-A"],
    createdBy: teacher._id,
    status: "scheduled",
  });

  console.log("\n✅ Seed complete!\n");
  console.log("Login credentials (all passwords: Password123):");
  console.log(`Super Admin:      ${superAdmin.email}`);
  console.log(`Institute Admin:  ${instituteAdmin.email}`);
  console.log(`Teacher:          ${teacher.email}`);
  console.log(`Student 1:        ${students[0].email}`);
  console.log(`Student 2:        ${students[1].email}`);
  console.log(`Institute code:   ${institute.code}`);
  console.log(`Demo exam:        "${exam.title}" (live now, 30 min)`);

  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
