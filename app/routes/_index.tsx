import { ImprovedGolfApp } from "../components/ImprovedGolfApp";

export function meta() {
  return [
    { title: "Golf Swing Analyzer - AI-Powered Golf Improvement" },
    { name: "description", content: "Analyze your golf swing with AI-powered recommendations and real-time feedback" },
  ];
}

export default function Index() {
  return <ImprovedGolfApp />;
}