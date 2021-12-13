import ReactMarkdown from "react-markdown";
import "./AboutPage.css";
import md from "./AboutPageMD";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import * as syntaxStyles from "react-syntax-highlighter/dist/esm/styles/prism";

export default function AboutPage(props: any) {
  return (
    <div id="markdown-doc">
      <ReactMarkdown
        children={md}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <SyntaxHighlighter
                children={String(children).replace(/\n$/, "")}
                style={syntaxStyles.atomDark}
                language={match[1]}
                PreTag="div"
              />
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      ></ReactMarkdown>
    </div>
  );
}
