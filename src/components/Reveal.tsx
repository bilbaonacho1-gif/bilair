import type { CSSProperties, ElementType, ReactNode } from 'react';
import { useReveal } from '../hooks/useReveal';

interface Props {
  as?: ElementType;
  className?: string;
  delay?: number;
  img?: boolean;
  style?: CSSProperties;
  id?: string;
  children: ReactNode;
}

export function Reveal({ as: Tag = 'div', className = '', delay = 0, img = false, style, id, children }: Props) {
  const { ref, inView } = useReveal<HTMLElement>();
  return (
    <Tag
      ref={ref}
      id={id}
      className={`${img ? 'reveal-img' : 'reveal'} ${inView ? 'is-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}
