'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

// 代码块组件
function CodeBlock({ 
  inline, 
  className, 
  children, 
  ...props 
}: any) {
  const [copied, setCopied] = React.useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  const handleCopy = async () => {
    const code = String(children).replace(/\n$/, '');
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code 
        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono text-indigo-600 dark:text-indigo-400"
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="relative group my-4">
      {/* 语言标签和复制按钮 */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-700 dark:bg-slate-900 rounded-t-lg border-b border-slate-600">
        <span className="text-xs text-slate-300 font-medium uppercase">
          {language || 'code'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2 text-slate-300 hover:text-white hover:bg-slate-600"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" />
              复制代码
            </>
          )}
        </Button>
      </div>
      
      {/* 代码内容 */}
      <pre className="!mt-0 !rounded-t-none overflow-x-auto bg-slate-900 text-slate-50 p-4">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code: CodeBlock,
          // 自定义段落 - 避免包含 block 元素
          p: ({ children }) => {
            // 检查子元素是否包含 pre 或 div（代码块）
            const hasBlockElement = React.Children.toArray(children).some(
              (child: any) => 
                child?.type === 'pre' || 
                child?.type === 'div' ||
                (child?.props?.node?.type === 'element' && 
                 (child?.props?.node?.tagName === 'pre' || child?.props?.node?.tagName === 'div'))
            );
            
            if (hasBlockElement) {
              return <div className="mb-3 last:mb-0">{children}</div>;
            }
            
            return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
          },
          // 自定义标题
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h3>
          ),
          // 自定义列表
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1 pl-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1 pl-2">{children}</ol>
          ),
          // 自定义链接
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {children}
            </a>
          ),
          // 自定义引用
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 py-2 my-3 bg-slate-50 dark:bg-slate-800/50 italic">
              {children}
            </blockquote>
          ),
          // 自定义表格
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-slate-200 dark:border-slate-700">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-slate-200 dark:border-slate-700 px-4 py-2 bg-slate-100 dark:bg-slate-800 font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 dark:border-slate-700 px-4 py-2">
              {children}
            </td>
          ),
          // 确保 pre 标签不被包裹在 p 中
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
