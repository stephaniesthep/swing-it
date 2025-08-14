import { ImprovedGolfApp } from "../components/ImprovedGolfApp";

export function meta() {
  return [
    { title: "Golf Swing Analyzer" },
    { name: "description", content: "Analyze your golf swing with AI-powered recommendations and real-time feedback" },
  ];
}

export default function Index() {
  return <ImprovedGolfApp />;
}