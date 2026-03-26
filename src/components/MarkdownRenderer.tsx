'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

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
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  if (inline) {
    return (
      <code 
        className="px-2 py-0.5 rounded bg-purple-500/10 text-sm font-mono text-purple-400 border border-purple-500/20"
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="relative group my-4">
      {/* 语言标签 */}
      {language && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-purple-500/20 rounded text-xs text-purple-400 font-mono">
          {language}
        </div>
      )}
      
      {/* 代码内容 */}
      <pre className="!mt-0 rounded-xl overflow-x-auto bg-[#0f0f1f] text-purple-100 p-4 border border-purple-500/20">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body text-purple-100 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code: CodeBlock,
          // 自定义段落
          p: ({ children }) => {
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
            <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-white">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0 text-white">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0 text-white">{children}</h3>
          ),
          // 自定义列表
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1 pl-2 text-purple-100">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1 pl-2 text-purple-100">{children}</ol>
          ),
          // 自定义链接
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
            >
              {children}
            </a>
          ),
          // 自定义引用
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-purple-500/50 pl-4 py-2 my-3 bg-purple-500/5 rounded-r text-purple-200/80">
              {children}
            </blockquote>
          ),
          // 自定义表格
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-purple-500/20 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-purple-500/20 px-4 py-2 bg-purple-500/10 font-semibold text-left text-white">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-purple-500/20 px-4 py-2 text-purple-100">
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
