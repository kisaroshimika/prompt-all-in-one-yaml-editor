import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, GripVertical, Trash2, Edit3, PlusCircle, Check, X } from 'lucide-react';
import { getContrastColor } from '../utils/yamlHelper';

export function SidebarItem({ id, name, isActive, onClick, isSubItem, color, onDelete, onAddSub, onRename }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isSubItem ? 'white' : (isActive ? 'rgba(99, 102, 241, 0.4)' : 'transparent'),
    backgroundImage: isSubItem ? `linear-gradient(${color}, ${color})` : 'none',
    color: isSubItem ? getContrastColor(color) : (isActive ? 'white' : '#9ca3af'),
    zIndex: isDragging ? 100 : 1,
  };

  const handleRename = (e) => {
    e.stopPropagation();
    onRename(editName);
    setIsEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className={`group sidebar-item-container flex items-center gap-2 rounded-xl transition-all ${isActive ? 'shadow-lg border border-white/20' : 'hover:bg-white/5'}`}>
      <div 
        {...attributes} 
        {...listeners} 
        className="drag-handle hover:text-white cursor-grab"
      >
        <GripVertical size={16} />
      </div>
      
      {isEditing ? (
        <div className="flex-1 flex items-center gap-1 p-1">
          <input 
            autoFocus
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRename(e)}
            className="flex-1 bg-black/20 border-none text-sm p-1.5 rounded h-8 text-white focus:outline-none"
            onClick={e => e.stopPropagation()}
          />
          <button onClick={handleRename} className="icon-btn text-green-400"><Check size={16}/></button>
          <button onClick={() => setIsEditing(false)} className="icon-btn text-red-400"><X size={16}/></button>
        </div>
      ) : (
        <button
          onClick={onClick}
          onDoubleClick={() => setIsEditing(true)}
          className="sidebar-item-btn flex-1"
        >
          {!isSubItem && <ChevronRight size={18} className={isActive ? 'rotate-90 transition-transform' : ''} />}
          <span className="font-semibold truncate text-sm">{name}</span>
          
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            {!isSubItem && (
              <button 
                onClick={(e) => { e.stopPropagation(); onAddSub(); }} 
                className="icon-btn"
                title="グループを追加"
              >
                <PlusCircle size={16} />
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
              className="icon-btn"
              title="リネーム"
            >
              <Edit3 size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="icon-btn text-red-400"
              title="削除"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </button>
      )}
    </div>
  );
}
