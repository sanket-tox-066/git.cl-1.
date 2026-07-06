import React, { useState, useEffect, useRef } from 'react';

interface TypingTerminalLineProps {
  text: string;
  type: 'cmd' | 'out' | 'err';
  speed?: number;
  onComplete?: () => void;
  theme?: 'retro-CRT' | 'modern-monokai';
}

export const TypingTerminalLine: React.FC<TypingTerminalLineProps> = ({
  text,
  type,
  speed = 3,
  onComplete,
  theme = 'retro-CRT'
}) => {
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    // If it's short, animate fast.
    // If it's long, we print in chunks so the user doesn't wait too long.
    let index = 0;
    let isMounted = true;
    
    // Calculate chunk size dynamically based on length
    // cmd is typed slowly character by character for high realism
    const isCmd = type === 'cmd';
    const chunkSize = isCmd 
      ? 1 
      : text.length > 500 
        ? 15 
        : text.length > 100 
          ? 5 
          : 2;

    const actualSpeed = isCmd ? 15 : speed;

    const interval = setInterval(() => {
      if (!isMounted) return;

      const nextStr = text.substring(0, index + chunkSize);
      index += chunkSize;

      setDisplayed(nextStr);

      if (index >= text.length) {
        clearInterval(interval);
        if (isMounted) {
          setDisplayed(text);
          setIsTyping(false);
          onComplete?.();
        }
      }
    }, actualSpeed);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [text, speed, type, onComplete]);

  const isCRT = theme === 'retro-CRT';

  let color = isCRT ? 'text-[#4af626]' : 'text-[#f8f8f2]';
  let prefix = '';

  if (type === 'cmd') {
    color = isCRT ? 'text-[#ffb000] font-bold' : 'text-[#a6e22e] font-bold';
    prefix = '$ ';
  } else if (type === 'err') {
    color = isCRT ? 'text-[#ff3333] font-semibold' : 'text-[#f92672] font-semibold';
    prefix = 'error: ';
  }

  const highlightCommandLine = (cmdText: string) => {
    const regex = /(".*?"|'.*?'|-[a-zA-Z0-9\-]+|\bgit\b|\b(?:status|add|commit|log|branch|checkout|merge|stash|diff|init|whoami|neofetch|ls|cat|rm|touch|clear|help|pwd|date|uname|echo|fsck|gc|config)\b|>>|>)/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(cmdText)) !== null) {
      const matchIndex = match.index;
      const matchText = match[0];
      
      if (matchIndex > lastIndex) {
        parts.push({
          text: cmdText.substring(lastIndex, matchIndex),
          type: 'plain'
        });
      }
      
      let partType = 'plain';
      if (matchText.startsWith('"') || matchText.startsWith("'")) {
        partType = 'string';
      } else if (matchText.startsWith('-')) {
        partType = 'flag';
      } else if (matchText === 'git') {
        partType = 'git';
      } else if (matchText === '>' || matchText === '>>') {
        partType = 'redirect';
      } else {
        partType = 'subcommand';
      }
      
      parts.push({
        text: matchText,
        type: partType
      });
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < cmdText.length) {
      parts.push({
        text: cmdText.substring(lastIndex),
        type: 'plain'
      });
    }
    
    return parts.map((part, idx) => {
      let className = '';
      if (part.type === 'string') {
        className = isCRT ? 'text-[#a3ffa3]' : 'text-[#e6db74]';
      } else if (part.type === 'flag') {
        className = isCRT ? 'text-[#ffb000]' : 'text-[#ae81ff]';
      } else if (part.type === 'git') {
        className = isCRT ? 'text-[#33ff33] font-bold' : 'text-[#a6e22e] font-bold';
      } else if (part.type === 'redirect') {
        className = isCRT ? 'text-[#ff3333] font-bold' : 'text-[#f92672] font-bold';
      } else if (part.type === 'subcommand') {
        className = isCRT ? 'text-[#00ffff] font-semibold' : 'text-[#66d9ef] font-semibold';
      } else {
        className = isCRT ? 'text-[#4af626]' : 'text-[#f8f8f2]';
      }
      return <span key={idx} className={className}>{part.text}</span>;
    });
  };

  const tokenizeAndStyle = (textToStyle: string, defaultClass: string) => {
    const regex = /(<[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}>|\b[0-9a-f]{40}\b|\b(?=[0-9a-f]*[a-f])[0-9a-f]{7}\b|\b[a-zA-Z0-9_\-\/]+\.(?:tsx|ts|jsx|js|json|html|css|md|txt|png|jpg|rules|config|cjs)\b|\borigin\/[a-zA-Z0-9_\-\/]+\b|\b(?:main|master|develop|release|bugfix|hotfix)\b|\b(?:error|failed|conflict|CRITICAL|Failed|Error|Conflict|warning|Warning|success|successful|Successfully|successfully|clean)\b|✓)/gi;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(textToStyle)) !== null) {
      const matchIndex = match.index;
      const matchText = match[0];

      if (matchIndex > lastIndex) {
        parts.push({
          text: textToStyle.substring(lastIndex, matchIndex),
          type: 'plain'
        });
      }

      let tokenType = 'plain';
      const lowerMatch = matchText.toLowerCase();

      if (matchText.startsWith('<') && matchText.endsWith('>')) {
        tokenType = 'email';
      } else if (matchText.length === 40 && /^[0-9a-f]{40}$/i.test(matchText)) {
        tokenType = 'commit';
      } else if (matchText.length === 7 && /^[0-9a-f]{7}$/i.test(matchText)) {
        tokenType = 'commit';
      } else if (matchText.includes('.')) {
        tokenType = 'file';
      } else if (lowerMatch.startsWith('origin/') || ['main', 'master', 'develop', 'release', 'bugfix', 'hotfix'].includes(lowerMatch)) {
        tokenType = 'branch';
      } else if (['error', 'failed', 'conflict', 'critical'].some(kw => lowerMatch.includes(kw))) {
        tokenType = 'error';
      } else if (['warning', 'warn'].some(kw => lowerMatch.includes(kw))) {
        tokenType = 'warning';
      } else if (['success', 'successful', 'successfully', 'clean'].some(kw => lowerMatch.includes(kw)) || matchText === '✓') {
        tokenType = 'success';
      }

      parts.push({
        text: matchText,
        type: tokenType
      });

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < textToStyle.length) {
      parts.push({
        text: textToStyle.substring(lastIndex),
        type: 'plain'
      });
    }

    return parts.map((part, idx) => {
      let className = defaultClass;
      if (part.type === 'commit') {
        className = isCRT ? 'text-[#ffb000] font-bold' : 'text-[#ae81ff] font-bold';
      } else if (part.type === 'branch') {
        className = isCRT ? 'text-[#00ffff] font-semibold' : 'text-[#fd971f] font-semibold';
      } else if (part.type === 'file') {
        className = isCRT ? 'text-[#a3ffa3] underline decoration-dotted' : 'text-[#e6db74] underline decoration-dotted';
      } else if (part.type === 'email') {
        className = isCRT ? 'text-[#4af626]/60 font-mono italic' : 'text-[#75715e] font-mono italic';
      } else if (part.type === 'error') {
        className = isCRT ? 'text-[#ff3333] font-bold' : 'text-[#f92672] font-bold';
      } else if (part.type === 'warning') {
        className = isCRT ? 'text-[#ffb000] font-semibold' : 'text-[#fd971f] font-semibold';
      } else if (part.type === 'success') {
        className = isCRT ? 'text-[#33ff33] font-semibold' : 'text-[#a6e22e] font-semibold';
      }
      return <span key={idx} className={className}>{part.text}</span>;
    });
  };

  const renderLineWithColors = (lineText: string, lineIndex: number) => {
    let lineClass = color;
    
    if (type === 'out') {
      const trimmed = lineText.trim();
      if (lineText.startsWith('+') && !lineText.startsWith('+++')) {
        lineClass = isCRT ? 'text-[#33ff33]' : 'text-[#a6e22e]';
        return (
          <div key={lineIndex} className={lineClass}>
            {lineText}
          </div>
        );
      } else if (lineText.startsWith('-') && !lineText.startsWith('---')) {
        lineClass = isCRT ? 'text-[#ff3333]' : 'text-[#f92672]';
        return (
          <div key={lineIndex} className={lineClass}>
            {lineText}
          </div>
        );
      } else if (lineText.startsWith('diff --git') || lineText.startsWith('--- a/') || lineText.startsWith('+++ b/')) {
        lineClass = isCRT ? 'text-[#a3ffa3] font-bold' : 'text-[#66d9ef] font-bold';
        return (
          <div key={lineIndex} className={lineClass}>
            {lineText}
          </div>
        );
      } else if (lineText.startsWith('commit ') && lineText.length > 10) {
        return (
          <div key={lineIndex} className={isCRT ? 'text-[#4af626]/80' : 'text-[#f8f8f2]'}>
            <span className={isCRT ? 'text-[#a3ffa3] font-bold' : 'text-[#f92672] font-bold'}>commit </span>
            {tokenizeAndStyle(lineText.substring(7), isCRT ? 'text-[#ffb000] font-bold' : 'text-[#ae81ff] font-bold')}
          </div>
        );
      } else if (lineText.startsWith('Author:')) {
        return (
          <div key={lineIndex} className={isCRT ? 'text-[#4af626]/70' : 'text-[#f8f8f2]/70'}>
            <span className={isCRT ? 'text-[#4af626]/50 font-semibold' : 'text-[#75715e] font-semibold'}>Author: </span>
            {tokenizeAndStyle(lineText.substring(7), isCRT ? 'text-[#4af626]/80' : 'text-[#f8f8f2]')}
          </div>
        );
      } else if (lineText.startsWith('Date:')) {
        return (
          <div key={lineIndex} className={isCRT ? 'text-[#4af626]/50' : 'text-[#75715e]'}>
            <span className="font-semibold">Date: </span>
            {lineText.substring(5)}
          </div>
        );
      } else if (lineText.startsWith('On branch: ') || lineText.startsWith('On branch ')) {
        const prefixLen = lineText.startsWith('On branch: ') ? 11 : 10;
        return (
          <div key={lineIndex} className={isCRT ? 'text-[#4af626]' : 'text-[#f8f8f2]'}>
            <span className="font-semibold">On branch </span>
            {tokenizeAndStyle(lineText.substring(prefixLen), isCRT ? 'text-[#00ffff] font-bold' : 'text-[#fd971f] font-bold')}
          </div>
        );
      } else if (trimmed.startsWith('staged:') || trimmed.startsWith('Added:')) {
        const colonIdx = lineText.indexOf(':');
        return (
          <div key={lineIndex} className={isCRT ? 'text-[#4af626]/90' : 'text-[#f8f8f2]/90'}>
            <span className={isCRT ? 'text-[#33ff33] font-semibold' : 'text-[#a6e22e] font-semibold'}>{lineText.substring(0, colonIdx + 1)}</span>
            {tokenizeAndStyle(lineText.substring(colonIdx + 1), isCRT ? 'text-[#4af626]' : 'text-[#f8f8f2]')}
          </div>
        );
      } else if (trimmed.startsWith('modified:') || trimmed.startsWith('untracked:')) {
        const colonIdx = lineText.indexOf(':');
        return (
          <div key={lineIndex} className={isCRT ? 'text-[#4af626]/90' : 'text-[#f8f8f2]/90'}>
            <span className={isCRT ? 'text-[#ff3333] font-semibold' : 'text-[#f92672] font-semibold'}>{lineText.substring(0, colonIdx + 1)}</span>
            {tokenizeAndStyle(lineText.substring(colonIdx + 1), isCRT ? 'text-[#4af626]' : 'text-[#f8f8f2]')}
          </div>
        );
      } else if (lineText.includes('OS:') || lineText.includes('Host:') || lineText.includes('Kernel:')) {
        const colonIndex = lineText.indexOf(':');
        if (colonIndex !== -1) {
          return (
            <div key={lineIndex} className={isCRT ? 'text-[#4af626]' : 'text-[#f8f8f2]'}>
              <span className={isCRT ? 'text-[#ffb000] font-semibold' : 'text-[#66d9ef] font-semibold'}>{lineText.substring(0, colonIndex + 1)}</span>
              {tokenizeAndStyle(lineText.substring(colonIndex + 1), isCRT ? 'text-[#4af626]' : 'text-[#f8f8f2]')}
            </div>
          );
        }
      }
    }

    if (type === 'cmd') {
      return (
        <div key={lineIndex} className={lineClass}>
          {lineIndex === 0 && <span className={isCRT ? 'text-[#ffb000] font-bold' : 'text-[#f92672] font-bold'}>{prefix}</span>}
          {highlightCommandLine(lineText)}
        </div>
      );
    }

    return (
      <div key={lineIndex} className={lineClass}>
        {lineIndex === 0 && prefix}
        {tokenizeAndStyle(lineText, lineClass)}
      </div>
    );
  };

  const lines = displayed.split('\n');

  return (
    <div className="whitespace-pre-wrap leading-relaxed font-mono">
      {lines.map((line, idx) => renderLineWithColors(line, idx))}
      {isTyping && (
        <span className={`inline-block w-1.5 h-3.5 ml-1 animate-pulse align-middle ${isCRT ? 'bg-[#4af626]' : 'bg-[#a6e22e]'}`} />
      )}
    </div>
  );
};
