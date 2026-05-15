export default function Avatar({ name = '', color = '#7c3aed', size = 'md', className = '' }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const sizes = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg',
  };

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 select-none ${className}`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </div>
  );
}
