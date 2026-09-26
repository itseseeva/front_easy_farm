import React from 'react';
import { ActiveSkill } from '../data/skillsLibrary';
import { Camera } from 'lucide-react';

interface Props {
  skill: ActiveSkill;
  className?: string;
  showLevel?: boolean;
  onUploadImage?: (id: string, base64: string) => void;
}

export const SkillIconRenderer: React.FC<Props> = ({
  skill,
  className = "w-full h-full",
  showLevel = false,
  onUploadImage
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUploadImage(skill.id, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset so selecting the same file again triggers onChange
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <div className={`relative rounded-lg overflow-hidden border border-[#2c3140] bg-[#13151d] group flex flex-col justify-between shadow-inner select-none ${className}`}>
      {/* If custom user-uploaded image is present */}
      {skill.customIcon ? (
        <img
          src={skill.customIcon}
          alt={skill.name}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />
      ) : (
        /* Themed SVG artwork tailored to the skill */
        <div className="absolute inset-0 flex items-center justify-center p-1.5 overflow-hidden pointer-events-none select-none">
          <RenderSkillArtwork svgType={skill.svgType} color={skill.color} />
        </div>
      )}

      {/* Subtle vignette/border gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20 pointer-events-none" />

      {/* Top subtle highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-white/10 pointer-events-none" />

      {/* Discrete Corner Action to upload/change photo without blocking icon drag */}
      {onUploadImage && (
        <div
          draggable={false}
          title="Загрузить / изменить фото умения"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDragStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute bottom-1 right-1 w-6 h-6 rounded-md bg-black/85 hover:bg-black text-gray-200 hover:text-white border border-white/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-150 cursor-pointer z-40 shadow pointer-events-auto hover:scale-110 active:scale-95 overflow-hidden"
        >
          <Camera className="w-3.5 h-3.5 text-gray-200 hover:text-white pointer-events-none" />
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            title="Загрузить фото"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50 p-0 m-0"
          />
        </div>
      )}
    </div>
  );
};

// Procedural SVG artwork generator matching Throne & Liberty aesthetic
const RenderSkillArtwork: React.FC<{ svgType: string; color: string }> = ({ svgType, color }) => {
  switch (svgType) {
    case 'ice_arrow':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#38bdf8]">
          <path d="M50 10 L68 40 L56 40 L64 75 L50 90 L36 75 L44 40 L32 40 Z" fill="#38bdf8" />
          <path d="M50 10 L58 40 L50 85 L42 40 Z" fill="#bae6fd" />
          <path d="M25 50 L38 45 L32 75 Z" fill="#0284c7" />
          <path d="M75 50 L62 45 L68 75 Z" fill="#0284c7" />
        </svg>
      );
    case 'chain_arrow':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#f59e0b]">
          <path d="M20 75 L75 25 L85 35 L30 85 Z" fill="#78350f" />
          <polygon points="70,15 95,20 85,45" fill="#f59e0b" />
          <ellipse cx="40" cy="55" rx="8" ry="14" fill="none" stroke="#fbbf24" strokeWidth="3" transform="rotate(-45 40 55)" />
          <ellipse cx="55" cy="40" rx="8" ry="14" fill="none" stroke="#f59e0b" strokeWidth="3" transform="rotate(-45 55 40)" />
        </svg>
      );
    case 'bullseye':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#ea580c]">
          <circle cx="45" cy="45" r="32" fill="none" stroke="#ea580c" strokeWidth="3" strokeDasharray="6 3" />
          <circle cx="45" cy="45" r="20" fill="none" stroke="#fb923c" strokeWidth="3" />
          <circle cx="45" cy="45" r="8" fill="#fdba74" />
          <polygon points="45,45 85,85 75,90 90,90 90,75 85,85" fill="#fed7aa" />
          <line x1="15" y1="45" x2="75" y2="45" stroke="#ea580c" strokeWidth="2" />
          <line x1="45" y1="15" x2="45" y2="75" stroke="#ea580c" strokeWidth="2" />
        </svg>
      );
    case 'ice_spikes':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#0284c7]">
          <polygon points="50,15 62,75 38,75" fill="#bae6fd" />
          <polygon points="28,30 42,80 20,80" fill="#38bdf8" />
          <polygon points="72,30 80,80 58,80" fill="#38bdf8" />
          <polygon points="50,15 54,75 46,75" fill="#ffffff" />
        </svg>
      );
    case 'nature_leaves':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#22c55e]">
          <path d="M40 25 C60 15 75 35 70 65 C50 70 35 50 40 25 Z" fill="#4ade80" />
          <path d="M25 45 C45 35 60 55 55 80 C35 85 20 70 25 45 Z" fill="#22c55e" />
          <path d="M40 25 Q55 45 70 65" stroke="#bbf7d0" strokeWidth="2" fill="none" />
          <polygon points="65,15 70,25 60,25" fill="#86efac" />
          <polygon points="80,35 85,42 75,44" fill="#86efac" />
        </svg>
      );
    case 'abyss_hook':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#06b6d4]">
          <path d="M50 75 C45 30 75 25 80 45 C82 55 75 65 65 60" fill="none" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" />
          <polygon points="50,70 58,88 42,88" fill="#67e8f9" />
          <line x1="20" y1="80" x2="80" y2="80" stroke="#0891b2" strokeWidth="3" />
        </svg>
      );
    case 'piercing_arrow':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#94a3b8]">
          <line x1="15" y1="85" x2="85" y2="15" stroke="#cbd5e1" strokeWidth="6" />
          <polygon points="85,15 65,15 85,35" fill="#f8fafc" />
          <polygon points="15,85 10,70 25,65" fill="#64748b" />
          <polygon points="15,85 30,90 35,75" fill="#64748b" />
        </svg>
      );
    case 'heal_hands':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#10b981]">
          <path d="M20 70 C20 50 35 45 42 55 C45 65 30 75 20 70 Z" fill="#34d399" opacity="0.8" />
          <path d="M80 70 C80 50 65 45 58 55 C55 65 70 75 80 70 Z" fill="#34d399" opacity="0.8" />
          {/* Glowing Cross */}
          <polygon points="46,25 54,25 54,35 64,35 64,43 54,43 54,53 46,53 46,43 36,43 36,35 46,35" fill="#a7f3d0" />
          <polygon points="26,35 30,35 30,40 35,40 35,44 30,44 30,49 26,49 26,44 21,44 21,40 26,40" fill="#6ee7b7" />
          <polygon points="68,35 72,35 72,40 77,40 77,44 72,44 72,49 68,49 68,44 63,44 63,40 68,40" fill="#6ee7b7" />
        </svg>
      );
    case 'fire_raptor':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#ef4444]">
          <polygon points="50,15 65,45 50,40 35,45" fill="#f87171" />
          <polygon points="50,42 70,80 50,65 30,80" fill="#ef4444" />
          <polygon points="50,15 55,40 50,35 45,40" fill="#fef08a" />
        </svg>
      );
    case 'wind_leaves':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#84cc16]">
          <path d="M20 70 Q50 30 80 70" stroke="#bef264" strokeWidth="3" fill="none" strokeDasharray="5 3" />
          <ellipse cx="35" cy="50" rx="8" ry="15" fill="#65a30d" transform="rotate(-30 35 50)" />
          <ellipse cx="60" cy="45" rx="8" ry="15" fill="#84cc16" transform="rotate(25 60 45)" />
          <ellipse cx="48" cy="30" rx="6" ry="12" fill="#a3e635" transform="rotate(10 48 30)" />
        </svg>
      );
    case 'hourglass_arrow':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#14b8a6]">
          {/* Hourglass */}
          <polygon points="50,30 75,30 62,50 75,70 50,70 62,50" fill="#0d9488" stroke="#5eead4" strokeWidth="2" />
          {/* Arrow curve */}
          <path d="M25 65 C25 25 65 15 80 35" fill="none" stroke="#2dd4bf" strokeWidth="4" />
          <polygon points="80,35 80,20 70,30" fill="#99f6e4" />
        </svg>
      );
    case 'radiant_burst':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#38bdf8]">
          <polygon points="50,10 56,40 50,85 44,40" fill="#e0f2fe" />
          <line x1="50" y1="50" x2="20" y2="20" stroke="#38bdf8" strokeWidth="3" />
          <line x1="50" y1="50" x2="80" y2="20" stroke="#38bdf8" strokeWidth="3" />
          <line x1="50" y1="50" x2="15" y2="50" stroke="#0284c7" strokeWidth="3" />
          <line x1="50" y1="50" x2="85" y2="50" stroke="#0284c7" strokeWidth="3" />
        </svg>
      );
    case 'shadow_slash':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#6366f1]">
          <path d="M20 30 C30 15 75 25 80 70 C60 55 35 60 20 30 Z" fill="#4338ca" />
          <path d="M25 40 C35 25 65 35 70 65 C55 55 35 55 25 40 Z" fill="#818cf8" />
        </svg>
      );
    case 'campfire':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#d97706]">
          {/* Stones */}
          <circle cx="30" cy="75" r="10" fill="#78350f" />
          <circle cx="50" cy="78" r="11" fill="#92400e" />
          <circle cx="70" cy="75" r="10" fill="#78350f" />
          {/* Flame */}
          <path d="M50 20 C65 40 70 60 50 70 C30 60 35 40 50 20 Z" fill="#f59e0b" />
          <path d="M50 35 C58 48 60 62 50 68 C40 62 42 48 50 35 Z" fill="#fef08a" />
        </svg>
      );
    case 'purple_vortex':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#a855f7]">
          <ellipse cx="50" cy="65" rx="35" ry="14" fill="none" stroke="#a855f7" strokeWidth="4" />
          <ellipse cx="50" cy="55" rx="26" ry="10" fill="none" stroke="#c084fc" strokeWidth="3" />
          <ellipse cx="50" cy="45" rx="16" ry="6" fill="none" stroke="#e9d5ff" strokeWidth="2" />
          <polygon points="50,15 54,42 46,42" fill="#d8b4fe" />
          <polygon points="35,22 42,45 32,45" fill="#a855f7" />
          <polygon points="65,22 68,45 58,45" fill="#a855f7" />
        </svg>
      );
    case 'lightning_zigzag':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#c084fc]">
          <polygon points="60,15 30,45 55,45 40,85 75,42 50,42" fill="#e9d5ff" stroke="#a855f7" strokeWidth="2" />
        </svg>
      );
    case 'shadow_spirit':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#818cf8]">
          <path d="M50 20 C65 20 70 45 65 75 C55 85 45 85 35 75 C30 45 35 20 50 20 Z" fill="#312e81" />
          <circle cx="50" cy="35" r="8" fill="#c7d2fe" />
          <path d="M25 40 C35 30 40 50 35 70" stroke="#6366f1" strokeWidth="3" fill="none" />
          <path d="M75 40 C65 30 60 50 65 70" stroke="#6366f1" strokeWidth="3" fill="none" />
        </svg>
      );
    case 'soul_spirits':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#94a3b8]">
          <circle cx="35" cy="45" r="14" fill="#475569" opacity="0.8" />
          <circle cx="65" cy="55" r="16" fill="#64748b" opacity="0.8" />
          <circle cx="32" cy="42" r="3" fill="#cbd5e1" />
          <circle cx="38" cy="42" r="3" fill="#cbd5e1" />
          <circle cx="62" cy="52" r="3" fill="#f1f5f9" />
          <circle cx="68" cy="52" r="3" fill="#f1f5f9" />
        </svg>
      );
    case 'ice_shard':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#06b6d4]">
          <polygon points="50,15 80,45 65,85 25,75 20,40" fill="#0891b2" />
          <polygon points="50,15 70,45 55,80 35,70 30,40" fill="#22d3ee" />
          <polygon points="50,15 58,40 50,75 40,65 35,40" fill="#cffafe" />
        </svg>
      );
    case 'solar_hands':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#eab308]">
          <circle cx="50" cy="50" r="16" fill="#fde047" />
          <path d="M25 65 C35 45 45 45 45 65" stroke="#ca8a04" strokeWidth="4" fill="none" />
          <path d="M75 65 C65 45 55 45 55 65" stroke="#ca8a04" strokeWidth="4" fill="none" />
          <line x1="50" y1="20" x2="50" y2="30" stroke="#facc15" strokeWidth="3" />
          <line x1="20" y1="50" x2="30" y2="50" stroke="#facc15" strokeWidth="3" />
          <line x1="80" y1="50" x2="70" y2="50" stroke="#facc15" strokeWidth="3" />
        </svg>
      );
    case 'ice_glacier':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#38bdf8]">
          <polygon points="35,15 65,15 85,85 15,85" fill="#0369a1" />
          <polygon points="40,25 60,25 75,80 25,80" fill="#38bdf8" />
          <polygon points="45,35 55,35 65,75 35,75" fill="#bae6fd" />
        </svg>
      );
    case 'thunder_blade':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#f59e0b]">
          <polygon points="50,15 65,40 55,40 70,75 45,50 55,50" fill="#fde047" stroke="#b45309" strokeWidth="2" />
        </svg>
      );
    case 'hellfire':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#dc2626]">
          <path d="M50 15 C75 35 80 65 65 85 C45 80 35 65 30 50 C40 50 45 35 50 15 Z" fill="#dc2626" />
          <path d="M50 35 C65 45 70 70 55 80 C42 75 38 65 42 55 C46 55 48 45 50 35 Z" fill="#f97316" />
          <circle cx="50" cy="65" r="8" fill="#fef08a" />
        </svg>
      );
    case 'gale_wave':
    default:
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#60a5fa]">
          <path d="M15 45 Q50 15 85 45 Q50 35 15 45 Z" fill="#93c5fd" />
          <path d="M15 60 Q50 30 85 60 Q50 50 15 60 Z" fill="#60a5fa" />
          <path d="M25 75 Q50 55 75 75 Q50 68 25 75 Z" fill="#3b82f6" />
        </svg>
      );
  }
};
