import { TestApp } from "../components/TestApp";

export function meta() {
  return [
    { title: "Golf Swing Analyzer" },
    { name: "description", content: "Analyze your golf swing with AI-powered recommendations and real-time feedback" },
  ];
}

export function loader() {
  return { message: "Golf Swing Analyzer Ready" };
}

export default function Home() {
  return <TestApp />;
}
