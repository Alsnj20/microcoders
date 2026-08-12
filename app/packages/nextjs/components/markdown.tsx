"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { memo, useState, type FC, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";

/**
 * Renderizador de Markdown reutilizable (standalone).
 *
 * Usa react-markdown + remark-gfm y el mismo estilizado que el componente
 * interno de assistant-ui (markdown-text), pero recibe el texto como prop en
 * lugar de depender del estado de assistant-ui — así se puede usar en cualquier
 * parte del UI (p.ej. las respuestas del chat).
 */

type CodeHeaderProps = {
  language: string;
  code: string;
};

const useCopyToClipboard = ({
  copiedDuration = 3000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(value).then(
      () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), copiedDuration);
      },
      () => {},
    );
  };

  return { isCopied, copyToClipboard };
};

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="aui-code-header-root border-border/50 bg-muted/50 mt-3 flex items-center justify-between rounded-t-xl border border-b-0 px-3.5 py-1.5 text-xs">
      <span className="aui-code-header-language text-muted-foreground font-medium lowercase">{language}</span>
      <TooltipIconButton tooltip="Copy" onClick={onCopy}>
        {!isCopied && <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />}
        {isCopied && <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />}
      </TooltipIconButton>
    </div>
  );
};

const MarkdownComponents = {
  h1: ({ className, ...props }: any) => (
    <h1 className={cn("aui-md-h1 mt-5 mb-2 scroll-m-20 text-xl font-semibold first:mt-0 last:mb-0", className)} {...props} />
  ),
  h2: ({ className, ...props }: any) => (
    <h2 className={cn("aui-md-h2 mt-5 mb-2 scroll-m-20 text-lg font-semibold first:mt-0 last:mb-0", className)} {...props} />
  ),
  h3: ({ className, ...props }: any) => (
    <h3 className={cn("aui-md-h3 mt-4 mb-1.5 scroll-m-20 text-base font-semibold first:mt-0 last:mb-0", className)} {...props} />
  ),
  h4: ({ className, ...props }: any) => (
    <h4 className={cn("aui-md-h4 mt-3.5 mb-1 scroll-m-20 text-base font-medium first:mt-0 last:mb-0", className)} {...props} />
  ),
  h5: ({ className, ...props }: any) => (
    <h5 className={cn("aui-md-h5 mt-3 mb-1 text-sm font-semibold first:mt-0 last:mb-0", className)} {...props} />
  ),
  h6: ({ className, ...props }: any) => (
    <h6 className={cn("aui-md-h6 mt-3 mb-1 text-sm font-medium first:mt-0 last:mb-0", className)} {...props} />
  ),
  p: ({ className, ...props }: any) => (
    <p className={cn("aui-md-p my-3 leading-relaxed first:mt-0 last:mb-0", className)} {...props} />
  ),
  a: ({ className, ...props }: any) => (
    <a className={cn("aui-md-a text-primary hover:text-primary/80 underline underline-offset-2", className)} {...props} />
  ),
  blockquote: ({ className, ...props }: any) => (
    <blockquote className={cn("aui-md-blockquote border-muted-foreground/30 text-muted-foreground my-3 border-s-2 ps-4", className)} {...props} />
  ),
  ul: ({ className, ...props }: any) => (
    <ul className={cn("aui-md-ul marker:text-muted-foreground my-3 ms-5 list-disc [&>li]:mt-1", className)} {...props} />
  ),
  ol: ({ className, ...props }: any) => (
    <ol className={cn("aui-md-ol marker:text-muted-foreground my-3 ms-5 list-decimal [&>li]:mt-1", className)} {...props} />
  ),
  hr: ({ className, ...props }: any) => (
    <hr className={cn("aui-md-hr border-muted-foreground/20 my-3", className)} {...props} />
  ),
  table: ({ className, ...props }: any) => (
    <div className="aui-md-table-wrap my-3 w-full overflow-x-auto rounded-lg border border-border/50">
      <table className={cn("aui-md-table w-full border-separate border-spacing-0 text-sm", className)} {...props} />
    </div>
  ),
  th: ({ className, ...props }: any) => (
    <th
      className={cn(
        "aui-md-th border-border/40 bg-muted border-s border-b px-3 py-1.5 text-start font-medium last:border-e [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: any) => (
    <td
      className={cn(
        "aui-md-td border-border/40 border-s border-b px-3 py-1.5 text-start last:border-e [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }: any) => (
    <tr className={cn("aui-md-tr m-0 p-0", className)} {...props} />
  ),
  li: ({ className, ...props }: any) => <li className={cn("aui-md-li leading-relaxed", className)} {...props} />,
  strong: ({ className, ...props }: any) => <strong className={cn("aui-md-strong font-semibold", className)} {...props} />,
  sup: ({ className, ...props }: any) => (
    <sup className={cn("aui-md-sup [&>a]:text-xs [&>a]:no-underline", className)} {...props} />
  ),
  pre: ({ children }: any) => <>{children}</>,
  code: function Code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const isCodeBlock = !!match;
    const code = String(children).replace(/\n$/, "");

    if (isCodeBlock) {
      return (
        <div className="my-3">
          <CodeHeader language={match[1]} code={code} />
          <pre className="aui-md-pre border-border/50 bg-muted/30 overflow-x-auto rounded-t-none rounded-b-xl border border-t-0 p-3.5 text-[13px] leading-relaxed">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      );
    }

    return (
      <code className={cn("aui-md-inline-code bg-muted rounded-md px-1.5 py-0.5 font-mono text-[0.85em]", className)} {...props}>
        {children}
      </code>
    );
  },
};

export interface MarkdownProps {
  children: string;
  className?: string;
}

export const Markdown = memo(function Markdown({ children, className = "" }: MarkdownProps) {
  return (
    <div className={cn("aui-md max-w-none text-foreground leading-relaxed", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents as any}>
        {children}
      </ReactMarkdown>
    </div>
  );
});
