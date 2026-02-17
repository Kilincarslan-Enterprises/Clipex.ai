'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import {
    Plus, Trash2, ChevronDown, ChevronUp, Sparkles,
    ArrowRight, RotateCw, Maximize2, ZapOff, Zap
} from 'lucide-react';
import type { Animation, AnimationType, AnimationEasing, SlideDirection, RotateDirection } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// ── Constants ───────────────────────────────────────────
const ANIMATION_TYPES: { value: AnimationType; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'shake', label: 'Shake', icon: <ZapOff size={12} />, color: 'text-red-400' },
    { value: 'fade_in', label: 'Fade In', icon: <Sparkles size={12} />, color: 'text-cyan-400' },
    { value: 'fade_out', label: 'Fade Out', icon: <Sparkles size={12} />, color: 'text-cyan-400' },
    { value: 'slide_in', label: 'Slide In', icon: <ArrowRight size={12} />, color: 'text-green-400' },
    { value: 'slide_out', label: 'Slide Out', icon: <ArrowRight size={12} />, color: 'text-green-400' },
    { value: 'scale', label: 'Scale', icon: <Maximize2 size={12} />, color: 'text-amber-400' },
    { value: 'rotate', label: 'Rotate', icon: <RotateCw size={12} />, color: 'text-purple-400' },
    { value: 'bounce', label: 'Bounce', icon: <ArrowRight size={12} />, color: 'text-orange-400' },
    { value: 'pulse', label: 'Pulse', icon: <Sparkles size={12} />, color: 'text-pink-400' },
];

const EASING_OPTIONS: { value: AnimationEasing; label: string }[] = [
    { value: 'linear', label: 'Linear' },
    { value: 'ease_in', label: 'Ease In' },
    { value: 'ease_out', label: 'Ease Out' },
    { value: 'ease_in_out', label: 'Ease In/Out' },
    { value: 'bounce', label: 'Bounce' },
];

const SLIDE_DIRECTIONS: { value: SlideDirection; label: string }[] = [
    { value: 'left', label: '← Left' },
    { value: 'right', label: '→ Right' },
    { value: 'top', label: '↑ Top' },
    { value: 'bottom', label: '↓ Bottom' },
];

function getDefaultAnimation(type: AnimationType): Partial<Animation> {
    switch (type) {
        case 'shake':
            return { strength: 10, frequency: 8 };
        case 'fade_in':
        case 'fade_out':
            return {};
        case 'slide_in':
        case 'slide_out':
            return { direction: 'left' };
        case 'scale':
            return { startScale: type === 'scale' ? 0 : 1, endScale: type === 'scale' ? 1 : 0 };
        case 'rotate':
            return { angle: 360, rotateDirection: 'cw' };
        case 'bounce':
            return { strength: 20, frequency: 3 };
        case 'pulse':
            return { strength: 0.2, frequency: 2 };
        default:
            return {};
    }
}

// ── Props ───────────────────────────────────────────────
interface AnimationsSectionProps {
    blockId: string;
    toggleFieldDynamic: (fieldName: string) => void;
    isFieldDynamic: (fieldName: string) => boolean;
}

// ── Components ──────────────────────────────────────────
export function AnimationsSection({ blockId, toggleFieldDynamic, isFieldDynamic }: AnimationsSectionProps) {
    const { template, updateBlock } = useStore();
    const block = template.timeline.find(b => b.id === blockId);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);

    if (!block || block.type === 'audio') return null;

    const animations = block.animations || [];

    // Find the array index of an animation by its id (for dynamic field paths)
    const animIndex = (animId: string) => animations.findIndex(a => a.id === animId);

    // Build a dynamic field key e.g. "animations.0.strength"
    const dynKey = (animId: string, param: string) => `animations.${animIndex(animId)}.${param}`;

    // ⚡ Dyn button — same pattern as PropertiesPanel
    const Dyn = ({ animId, param }: { animId: string; param: string }) => {
        const field = dynKey(animId, param);
        const active = isFieldDynamic(field);
        return (
            <button
                onClick={(e) => { e.preventDefault(); toggleFieldDynamic(field); }}
                className={`w-5 h-5 inline-flex items-center justify-center rounded transition-all shrink-0 ${active
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                    : 'text-neutral-700 hover:text-neutral-500 hover:bg-neutral-800'
                    }`}
                title={active ? `"${field}" is dynamic via API – click to disable` : `Make "${field}" controllable via API`}
            >
                <Zap size={10} className={active ? 'fill-orange-400' : ''} />
            </button>
        );
    };

    // Input class with optional orange ring when dynamic
    const inputCls = (animId: string, param: string) =>
        `bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-violet-500 outline-none w-full ${isFieldDynamic(dynKey(animId, param)) ? 'ring-1 ring-orange-500/40' : ''}`;

    const selectCls = (animId: string, param: string) =>
        `bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-violet-500 outline-none w-full ${isFieldDynamic(dynKey(animId, param)) ? 'ring-1 ring-orange-500/40' : ''}`;

    const addAnimation = (type: AnimationType) => {
        const newAnim: Animation = {
            id: uuidv4(),
            type,
            time: 0,
            duration: 1,
            easing: 'ease_in_out',
            ...getDefaultAnimation(type),
        };
        updateBlock(blockId, { animations: [...animations, newAnim] });
        setExpandedId(newAnim.id);
        setShowAddMenu(false);
    };

    const updateAnimation = (animId: string, updates: Partial<Animation>) => {
        const updated = animations.map(a => a.id === animId ? { ...a, ...updates } : a);
        updateBlock(blockId, { animations: updated });
    };

    const removeAnimation = (animId: string) => {
        updateBlock(blockId, { animations: animations.filter(a => a.id !== animId) });
        if (expandedId === animId) setExpandedId(null);
    };

    return (
        <>
            <hr className="border-neutral-800" />
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-violet-400 uppercase flex items-center gap-1.5">
                        <Sparkles size={12} /> Animations
                    </h3>
                    <div className="relative">
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 rounded transition-all"
                        >
                            <Plus size={12} /> Add
                        </button>

                        {/* Dropdown to pick animation type */}
                        {showAddMenu && (
                            <div className="absolute right-0 top-full mt-1 z-50 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl p-1 w-40">
                                {ANIMATION_TYPES.map(at => (
                                    <button
                                        key={at.value}
                                        onClick={() => addAnimation(at.value)}
                                        className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs rounded hover:bg-neutral-700 transition-colors ${at.color}`}
                                    >
                                        {at.icon} {at.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {animations.length === 0 && (
                    <div className="text-xs text-neutral-600 text-center py-3 border border-dashed border-neutral-800 rounded-lg">
                        No animations. Click &quot;Add&quot; to get started.
                    </div>
                )}

                {/* Animation List */}
                {animations.map(anim => {
                    const meta = ANIMATION_TYPES.find(t => t.value === anim.type);
                    const isExpanded = expandedId === anim.id;

                    return (
                        <div key={anim.id} className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg overflow-hidden">
                            {/* Header Row */}
                            <div
                                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-800/80 transition-colors"
                                onClick={() => setExpandedId(isExpanded ? null : anim.id)}
                            >
                                <span className={`${meta?.color || 'text-neutral-400'}`}>{meta?.icon}</span>
                                <span className="text-sm font-medium text-neutral-200 flex-1">{meta?.label || anim.type}</span>
                                <span className="text-[10px] text-neutral-500 font-mono">{anim.time}s → {anim.time + anim.duration}s</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeAnimation(anim.id); }}
                                    className="p-1 text-neutral-600 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 size={12} />
                                </button>
                                {isExpanded ? <ChevronUp size={14} className="text-neutral-500" /> : <ChevronDown size={14} className="text-neutral-500" />}
                            </div>

                            {/* Expanded Detail */}
                            {isExpanded && (
                                <div className="px-3 pb-3 pt-1 space-y-3 border-t border-neutral-700/40">
                                    {/* Common: Time, Duration, Easing */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] text-neutral-500 uppercase">Start (s)</label>
                                                <Dyn animId={anim.id} param="time" />
                                            </div>
                                            <input
                                                type="number" step="0.1" min="0"
                                                value={anim.time}
                                                onChange={e => updateAnimation(anim.id, { time: parseFloat(e.target.value) || 0 })}
                                                className={inputCls(anim.id, 'time')}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] text-neutral-500 uppercase">Duration (s)</label>
                                                <Dyn animId={anim.id} param="duration" />
                                            </div>
                                            <input
                                                type="number" step="0.1" min="0.1"
                                                value={anim.duration}
                                                onChange={e => updateAnimation(anim.id, { duration: parseFloat(e.target.value) || 0.1 })}
                                                className={inputCls(anim.id, 'duration')}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] text-neutral-500 uppercase">Easing</label>
                                            <Dyn animId={anim.id} param="easing" />
                                        </div>
                                        <select
                                            value={anim.easing || 'ease_in_out'}
                                            onChange={e => updateAnimation(anim.id, { easing: e.target.value as AnimationEasing })}
                                            className={selectCls(anim.id, 'easing')}
                                        >
                                            {EASING_OPTIONS.map(eo => (
                                                <option key={eo.value} value={eo.value}>{eo.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* ── Type-specific params ── */}
                                    {/* Shake */}
                                    {anim.type === 'shake' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-neutral-500 uppercase">Strength (px)</label>
                                                    <Dyn animId={anim.id} param="strength" />
                                                </div>
                                                <input
                                                    type="number" step="1" min="1"
                                                    value={anim.strength ?? 10}
                                                    onChange={e => updateAnimation(anim.id, { strength: parseInt(e.target.value) || 10 })}
                                                    className={inputCls(anim.id, 'strength')}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-neutral-500 uppercase">Frequency (Hz)</label>
                                                    <Dyn animId={anim.id} param="frequency" />
                                                </div>
                                                <input
                                                    type="number" step="1" min="1"
                                                    value={anim.frequency ?? 8}
                                                    onChange={e => updateAnimation(anim.id, { frequency: parseInt(e.target.value) || 8 })}
                                                    className={inputCls(anim.id, 'frequency')}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Slide */}
                                    {(anim.type === 'slide_in' || anim.type === 'slide_out') && (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] text-neutral-500 uppercase">Direction</label>
                                                <Dyn animId={anim.id} param="direction" />
                                            </div>
                                            <select
                                                value={anim.direction || 'left'}
                                                onChange={e => updateAnimation(anim.id, { direction: e.target.value as SlideDirection })}
                                                className={selectCls(anim.id, 'direction')}
                                            >
                                                {SLIDE_DIRECTIONS.map(sd => (
                                                    <option key={sd.value} value={sd.value}>{sd.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Scale */}
                                    {anim.type === 'scale' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-neutral-500 uppercase">Start Scale</label>
                                                    <Dyn animId={anim.id} param="startScale" />
                                                </div>
                                                <input
                                                    type="number" step="0.1" min="0"
                                                    value={anim.startScale ?? 0}
                                                    onChange={e => updateAnimation(anim.id, { startScale: parseFloat(e.target.value) || 0 })}
                                                    className={inputCls(anim.id, 'startScale')}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-neutral-500 uppercase">End Scale</label>
                                                    <Dyn animId={anim.id} param="endScale" />
                                                </div>
                                                <input
                                                    type="number" step="0.1" min="0"
                                                    value={anim.endScale ?? 1}
                                                    onChange={e => updateAnimation(anim.id, { endScale: parseFloat(e.target.value) || 1 })}
                                                    className={inputCls(anim.id, 'endScale')}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Rotate */}
                                    {anim.type === 'rotate' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-neutral-500 uppercase">Angle (°)</label>
                                                    <Dyn animId={anim.id} param="angle" />
                                                </div>
                                                <input
                                                    type="number" step="15" min="0"
                                                    value={anim.angle ?? 360}
                                                    onChange={e => updateAnimation(anim.id, { angle: parseInt(e.target.value) || 360 })}
                                                    className={inputCls(anim.id, 'angle')}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-neutral-500 uppercase">Direction</label>
                                                    <Dyn animId={anim.id} param="rotateDirection" />
                                                </div>
                                                <select
                                                    value={anim.rotateDirection || 'cw'}
                                                    onChange={e => updateAnimation(anim.id, { rotateDirection: e.target.value as RotateDirection })}
                                                    className={selectCls(anim.id, 'rotateDirection')}
                                                >
                                                    <option value="cw">Clockwise</option>
                                                    <option value="ccw">Counter-CW</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Bounce */}
                                    {anim.type === 'bounce' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-neutral-500 uppercase">Height (px)</label>
                                                    <Dyn animId={anim.id} param="strength" />
                                                </div>
                                                <input
                                                    type="number" step="5" min="5"
                                                    value={anim.strength ?? 20}
                                                    onChange={e => updateAnimation(anim.id, { strength: parseInt(e.target.value) || 20 })}
                                                    className={inputCls(anim.id, 'strength')}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-neutral-500 uppercase">Bounces</label>
                                                    <Dyn animId={anim.id} param="frequency" />
                                                </div>
                                                <input
                                                    type="number" step="1" min="1"
                                                    value={anim.frequency ?? 3}
                                                    onChange={e => updateAnimation(anim.id, { frequency: parseInt(e.target.value) || 3 })}
                                                    className={inputCls(anim.id, 'frequency')}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Pulse */}
                                    {anim.type === 'pulse' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-neutral-500 uppercase">Intensity</label>
                                                    <Dyn animId={anim.id} param="strength" />
                                                </div>
                                                <input
                                                    type="number" step="0.05" min="0.05"
                                                    value={anim.strength ?? 0.2}
                                                    onChange={e => updateAnimation(anim.id, { strength: parseFloat(e.target.value) || 0.2 })}
                                                    className={inputCls(anim.id, 'strength')}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] text-neutral-500 uppercase">Cycles</label>
                                                    <Dyn animId={anim.id} param="frequency" />
                                                </div>
                                                <input
                                                    type="number" step="1" min="1"
                                                    value={anim.frequency ?? 2}
                                                    onChange={e => updateAnimation(anim.id, { frequency: parseInt(e.target.value) || 2 })}
                                                    className={inputCls(anim.id, 'frequency')}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}
