/**
 * The public calculators, in one place.
 *
 * The hub page, the cross-links at the foot of each tool and the sitemap all
 * read from here, so adding a tool cannot leave it orphaned the way the
 * attendance calculator was when it was the only one.
 */
export type Tool = {
  slug: string;
  /** Used as the H1 and in the hub card. */
  name: string;
  /** <title>. Written for the search result, not for the page. */
  title: string;
  description: string;
  /** One line on the hub card and in the cross-links. */
  blurb: string;
  keywords: string[];
};

export const TOOLS: Tool[] = [
  {
    slug: "attendance-calculator",
    name: "Attendance percentage calculator",
    title: "Attendance Percentage Calculator: how many classes can you miss?",
    description:
      "Free attendance calculator for school and college. Enter classes attended and held to see your percentage, how many more you can miss at 75%, and how many you must attend to recover.",
    blurb: "Your percentage, how many classes you can still miss, and how many you need to recover.",
    keywords: [
      "attendance percentage calculator", "how many classes can I miss",
      "75 percent attendance calculator", "college attendance calculator",
      "school attendance calculator", "attendance shortage calculator",
    ],
  },
  {
    slug: "cgpa-calculator",
    name: "CGPA to percentage calculator",
    title: "CGPA to Percentage Calculator (and back), with every formula",
    description:
      "Convert CGPA to percentage and percentage to CGPA, using the ×9.5 CBSE formula, a straight ten-point scale, or (CGPA − 0.75) × 10. Free, instant, no account.",
    blurb: "Convert CGPA to percentage and back, on whichever formula your university uses.",
    keywords: [
      "cgpa to percentage", "percentage to cgpa", "cgpa calculator",
      "cgpa to percentage formula", "9.5 formula cgpa", "convert cgpa",
    ],
  },
  {
    slug: "final-grade-calculator",
    name: "Final grade calculator",
    title: "Final Grade Calculator: what do you need on the final exam?",
    description:
      "Work out the mark you need in your final exam to reach the grade you want. Enter your current grade and what the final is worth. Free and instant.",
    blurb: "The mark you need in the final to land the grade you are aiming for.",
    keywords: [
      "final grade calculator", "what do I need on my final",
      "final exam calculator", "grade needed calculator", "exam mark needed",
    ],
  },
  {
    slug: "gpa-calculator",
    name: "GPA calculator",
    title: "GPA Calculator: credit-weighted, on any grade scale",
    description:
      "Calculate your GPA or SGPA from course credits and grade points, on a 10-point or 4-point scale. Add as many courses as you need. Free, no signup.",
    blurb: "Credit-weighted GPA or SGPA from your courses, on a 10 or 4 point scale.",
    keywords: [
      "gpa calculator", "sgpa calculator", "weighted gpa calculator",
      "credit gpa calculator", "semester gpa", "grade point average calculator",
    ],
  },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);
export const otherTools = (slug: string) => TOOLS.filter((t) => t.slug !== slug);
