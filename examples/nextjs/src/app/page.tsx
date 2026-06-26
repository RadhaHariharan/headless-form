import Link from "next/link";
import "./landing.css";

const demos = [
  {
    href: "/forms-demo",
    title: "Forms",
    description: "@headlesskit/forms-react — headless form state, validation, and field helpers.",
  },
  {
    href: "/state-management-demo",
    title: "State management",
    description: "@headlesskit/state-management-toolkit — configureStore + createSlice.",
  },
  {
    href: "/state-management-simplify-demo",
    title: "State management (simplify)",
    description: "@headlesskit/state-management-simplify-react — lightweight hook-based store.",
  },
];

export default function Home() {
  return (
    <div className="landingPage">
      <h1>headlesskit examples</h1>
      <p className="intro">Pick a demo:</p>
      <ul className="demoList">
        {demos.map((demo) => (
          <li key={demo.href}>
            <Link href={demo.href} className="demoCard">
              <span className="demoTitle">{demo.title}</span>
              <span className="demoDescription">{demo.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
