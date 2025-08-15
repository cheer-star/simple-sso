'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownGuideProps {
  content: string;
}

export function MarkdownGuide({ content }: MarkdownGuideProps) {
  return (
    <div 
      // prose-invert dark:prose-invert 会自动处理暗色模式下的文本颜色
      className="prose prose-sm prose-slate dark:prose-invert max-w-none 
                 prose-pre:bg-slate-800 prose-pre:text-slate-50"
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}