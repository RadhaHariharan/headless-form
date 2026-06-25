"use client"

import { Highlight } from "prism-react-renderer";
import { create } from "@headlesskit/state-management-simplify-react";
import CopyButton from "./CopyButton";
import SnippetLang from "./SnippetLang";
import javascriptCode from "../resources/javascript-code";
import typescriptCode from "../resources/typescript-code";

interface CodePreviewStore {
  lang: string;
  setLang: (lang: string) => void;
  getCode: () => string;
}

const useStore = create<CodePreviewStore>()((set, get) => ({
  lang: "javascript",
  setLang: (lang) => set(() => ({ lang })),
  getCode: () =>
    get().lang === "javascript" ? javascriptCode : typescriptCode,
}));

export default function CodePreview() {
  const { lang, setLang, getCode } = useStore();
  const code = getCode();

  return (
    <Highlight code={code} language="tsx" theme={undefined}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        // define how each line is to be rendered in the code block,
        // position is set to relative so the copy button can align to bottom right
        <pre className={className} style={{ ...style, position: "relative" }}>
          {tokens.map((line, i) => (
            <div {...getLineProps({ line })} key={i}>
              {line.map((token, key) => (
                <span {...getTokenProps({ token })} key={key} />
              ))}
            </div>
          ))}
          <div className="snippet-container">
            <SnippetLang lang={lang} setLang={setLang} />
            <CopyButton code={code} />
          </div>
        </pre>
      )}
    </Highlight>
  );
}
