import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Save, Upload, Search, Trash2, Edit3, Settings, 
  ChevronRight, ChevronDown, RefreshCcw, Download, Check, Palette,
  FolderPlus, PlusCircle, FileUp, AlertCircle, Pipette, Globe, Folders
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { RgbaColorPicker } from "react-colorful";

import { parseYAML, stringifyYAML, translateText, rgbaToObj, objToRgba, hexToRgba, getContrastColor } from './utils/yamlHelper';
import { SidebarItem } from './components/SidebarItem';
import { TagCard } from './components/TagCard';

export default function App() {
  const [data, setData] = useState([]);
  const [activeDragId, setActiveDragId] = useState(null);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('local');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isDraggingLanding, setIsDraggingLanding] = useState(false);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  // 初回読み込み - public/prepend.yaml を確実に読み込むように修正
  useEffect(() => {
    const loadDefault = async () => {
      setLoadError(null);
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const response = await fetch(baseUrl + 'prepend.yaml?t=' + Date.now()); 
        if (response.ok) {
          const text = await response.text();
          if (!text || text.trim() === '' || text.includes('<!DOCTYPE') || text.includes('<html')) {
            console.warn('prepend.yaml is empty or returned as HTML (e.g. SPA fallback).');
            return;
          }
          const parsed = parseYAML(text);
          if (parsed && parsed.length > 0) {
            setData(parsed);
            setIsDataLoaded(true);
            console.log('Loaded default prepend.yaml successfully.', parsed);
          } else {
            console.error('YAML could not be parsed into categories.');
            setLoadError('YAMLファイルの形式を正しく解析できませんでした。内容を確認してください。');
          }
        } else {
          console.log('Default prepend.yaml not found on server (404 etc).');
        }
      } catch (e) {
        console.error('Default prepend.yaml fetch failed:', e);
        setLoadError('サーバーからの読み込みに失敗しました。');
      }
    };
    loadDefault();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeCategory = data[activeCategoryIndex];
  const activeGroup = activeCategory?.groups?.[activeGroupIndex];

  // --- Handlers ---

  const processFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (re) => {
      const parsed = parseYAML(re.target.result);
      if (parsed && parsed.length > 0) {
        setData(parsed);
        setIsDataLoaded(true);
        setActiveCategoryIndex(0);
        setActiveGroupIndex(0);
        setLoadError(null);
      } else {
        alert('YAMLファイルを読み込めませんでした。形式が正しいか確認してください。');
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e) => {
    processFile(e.target.files[0]);
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    if (type === 'landing') setIsDraggingLanding(false);
    if (type === 'sidebar') setIsDraggingSidebar(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        processFile(file);
      } else {
        alert('YAMLファイル (.yaml, .yml) をドロップしてください。');
      }
    }
  };

  const handleDragOver = (e, type) => {
    e.preventDefault();
    if (type === 'landing') setIsDraggingLanding(true);
    if (type === 'sidebar') setIsDraggingSidebar(true);
  };

  const handleDragLeave = (e, type) => {
    e.preventDefault();
    if (type === 'landing') setIsDraggingLanding(false);
    if (type === 'sidebar') setIsDraggingSidebar(false);
  };

  const handleSave = () => {
    if (data.length === 0) return;
    const currentYaml = stringifyYAML(data);
    
    const download = (content, filename) => {
      const blob = new Blob([content], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    download(currentYaml, 'prepend.yaml');
  };

  const updateTag = (tagId, updates, catIdx = activeCategoryIndex, grpIdx = activeGroupIndex) => {
    setData(prev => {
      const newData = [...prev];
      const category = { ...newData[catIdx] };
      const groups = [...category.groups];
      const group = { ...groups[grpIdx] };
      const tagList = [...group.tagList];
      const tagIndex = tagList.findIndex(t => t.id === tagId);
      if (tagIndex !== -1) {
        tagList[tagIndex] = { ...tagList[tagIndex], ...updates };
        group.tagList = tagList;
        groups[grpIdx] = group;
        category.groups = groups;
        newData[catIdx] = category;
        return newData;
      }
      return prev;
    });
  };

  const deleteTag = (tagId, catIdx = activeCategoryIndex, grpIdx = activeGroupIndex) => {
    setData(prev => {
      const newData = [...prev];
      const category = { ...newData[catIdx] };
      const groups = [...category.groups];
      const group = { ...groups[grpIdx] };
      group.tagList = group.tagList.filter(t => t.id !== tagId);
      groups[grpIdx] = group;
      category.groups = groups;
      newData[catIdx] = category;
      return newData;
    });
  };

  const addTag = () => {
    if (!activeGroup) return;
    setData(prev => {
      const newData = [...prev];
      const category = { ...newData[activeCategoryIndex] };
      const groups = [...category.groups];
      const group = { ...groups[activeGroupIndex] };
      
      const existingPrompts = group.tagList.map(t => t.prompt);
      let basePrompt = 'new_prompt';
      let promptName = basePrompt;
      let counter = 1;
      while (existingPrompts.includes(promptName)) {
        promptName = `${basePrompt}_${counter}`;
        counter++;
      }

      const newTag = {
        id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        prompt: promptName,
        label: '新規タグ'
      };
      group.tagList = [newTag, ...group.tagList];
      groups[activeGroupIndex] = group;
      category.groups = groups;
      newData[activeCategoryIndex] = category;
      return newData;
    });
  };

  const addCategory = () => {
    setData(prev => [
      ...prev,
      {
        id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: '新規カテゴリ',
        groups: []
      }
    ]);
  };

  const addGroup = (catIdx) => {
    setData(prev => {
      const newData = [...prev];
      const category = { ...newData[catIdx] };
      category.groups = [
        ...category.groups,
        {
          id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: '新規グループ',
          color: 'rgba(99, 102, 241, 0.4)',
          tagList: []
        }
      ];
      newData[catIdx] = category;
      return newData;
    });
  };

  const deleteCategory = (catIdx) => {
    if (!window.confirm('カテゴリを削除しますか？')) return;
    const newData = data.filter((_, i) => i !== catIdx);
    setData(newData);
    setActiveCategoryIndex(0);
  };

  const deleteGroup = (catIdx, grpIdx) => {
    if (!window.confirm('グループを削除しますか？')) return;
    setData(prev => {
      const newData = [...prev];
      const category = { ...newData[catIdx] };
      category.groups = category.groups.filter((_, i) => i !== grpIdx);
      newData[catIdx] = category;
      return newData;
    });
  };

  const updateGroupColor = (colorObj) => {
    const colorStr = objToRgba(colorObj);
    setData(prev => {
      const newData = [...prev];
      const category = { ...newData[activeCategoryIndex] };
      const groups = [...category.groups];
      const group = { ...groups[activeGroupIndex] };
      group.color = colorStr;
      groups[activeGroupIndex] = group;
      category.groups = groups;
      newData[activeCategoryIndex] = category;
      return newData;
    });
  };

  const handleColorInputChange = (key, value, currentRgba) => {
    const obj = rgbaToObj(currentRgba);
    let val = parseFloat(value);
    if (isNaN(val)) val = 0;
    
    if (key === 'a') {
      val = Math.max(0, Math.min(1, val));
    } else {
      val = Math.max(0, Math.min(255, Math.round(val)));
    }
    
    updateGroupColor({ ...obj, [key]: val });
  };

  const handleEyeDropper = async () => {
    if (!window.EyeDropper) {
      alert('お使いのブラウザはスポイト機能をサポートしていません。Chrome または Edge をお試しください。');
      return;
    }
    const eyeDropper = new window.EyeDropper();
    try {
      const result = await eyeDropper.open();
      const currentAlpha = rgbaToObj(activeGroup.color).a;
      const newColorObj = hexToRgba(result.sRGBHex, currentAlpha);
      updateGroupColor(newColorObj);
    } catch (e) {
      console.log('EyeDropper cancelled or failed');
    }
  };

  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const handleDragEnd = (event) => {
    setActiveDragId(null);
    try {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      
      const activeIdStr = active.id.toString();
      const overIdStr = over.id.toString();

      if (activeIdStr.startsWith('cat-') && overIdStr.startsWith('cat-')) {
        const oldIndex = data.findIndex(c => c.id === active.id);
        const newIndex = data.findIndex(c => c.id === over.id);
        setData(arrayMove(data, oldIndex, newIndex));
        return;
      } 
      
      if (activeIdStr.startsWith('group-') && overIdStr.startsWith('group-')) {
        const newData = [...data];
        const category = { ...newData[activeCategoryIndex] };
        const oldIndex = category.groups.findIndex(g => g.id === active.id);
        const newIndex = category.groups.findIndex(g => g.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          category.groups = arrayMove(category.groups, oldIndex, newIndex);
          newData[activeCategoryIndex] = category;
          setData(newData);
        }
        return;
      }
      
      if (activeIdStr.startsWith('tag-') && overIdStr.startsWith('group-')) {
        let sourceCatIdx = -1, sourceGrpIdx = -1, activeTag = null;
        for (let c = 0; c < data.length; c++) {
          const currentCat = data[c];
          if (!currentCat || !currentCat.groups) continue;
          for (let g = 0; g < currentCat.groups.length; g++) {
            const currentGroup = currentCat.groups[g];
            const safeTagList = currentGroup.tagList || [];
            const tIdx = safeTagList.findIndex(t => t.id === active.id);
            if (tIdx !== -1) {
              sourceCatIdx = c; sourceGrpIdx = g;
              activeTag = safeTagList[tIdx];
              break;
            }
          }
          if (activeTag) break;
        }

        let targetCatIdx = -1, targetGrpIdx = -1;
        for (let c = 0; c < data.length; c++) {
          const currentCat = data[c];
          if (!currentCat || !currentCat.groups) continue;
          const gIdx = currentCat.groups.findIndex(g => g.id === over.id);
          if (gIdx !== -1) {
            targetCatIdx = c; targetGrpIdx = gIdx;
            break;
          }
        }

        if (!activeTag || targetCatIdx === -1 || targetGrpIdx === -1) return;
        if (sourceCatIdx === targetCatIdx && sourceGrpIdx === targetGrpIdx) return;
        
        const targetGroup = data[targetCatIdx].groups[targetGrpIdx];
        const safeTargetTagList = targetGroup.tagList || [];
        const existingPrompts = safeTargetTagList.map(t => t.prompt);
        
        if (existingPrompts.includes(activeTag.prompt)) {
          // setDataの外なので1度だけ呼び出される。かつReactのDOM更新サイクルを阻害しないための遅延
          setTimeout(() => {
            alert(`移動先のグループに「${activeTag.prompt}」と同じプロンプトが既に存在するため、移動できませんでした。`);
          }, 10);
          return;
        }

        const newData = [...data];
        const sCat = { ...newData[sourceCatIdx] };
        const sGrps = [...sCat.groups];
        const sGrp = { ...sGrps[sourceGrpIdx] };
        sGrp.tagList = (sGrp.tagList || []).filter(t => t.id !== active.id);
        sGrps[sourceGrpIdx] = sGrp;
        sCat.groups = sGrps;
        newData[sourceCatIdx] = sCat;

        const tCat = newData[targetCatIdx] ? { ...newData[targetCatIdx] } : { ...data[targetCatIdx] };
        const tGrps = [...tCat.groups];
        const tGrp = { ...tGrps[targetGrpIdx] };
        tGrp.tagList = [activeTag, ...(tGrp.tagList || [])];
        tGrps[targetGrpIdx] = tGrp;
        tCat.groups = tGrps;
        newData[targetCatIdx] = tCat;

        setData(newData);
        return;
      }

      if (activeIdStr.startsWith('tag-') && overIdStr.startsWith('tag-')) {
        if (searchQuery) return; // 検索中は並び替えをブロック
        const newData = [...data];
        const category = { ...newData[activeCategoryIndex] };
        const groups = [...category.groups];
        const group = { ...groups[activeGroupIndex] };
        const safeTagList = group.tagList || [];
        const oldIndex = safeTagList.findIndex(t => t.id === active.id);
        const newIndex = safeTagList.findIndex(t => t.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          group.tagList = arrayMove(safeTagList, oldIndex, newIndex);
          groups[activeGroupIndex] = group;
          category.groups = groups;
          newData[activeCategoryIndex] = category;
          setData(newData);
        }
      }
    } catch (e) {
      console.error("DragEnd processing error:", e);
    }
  };

  const filteredTags = useMemo(() => {
    const q = searchQuery.toLowerCase();
    
    if (searchMode === 'global' && q) {
      const results = [];
      data.forEach((cat, cIdx) => {
        cat.groups?.forEach((grp, gIdx) => {
          grp.tagList?.forEach(tag => {
            if ((tag.label?.toLowerCase() || '').includes(q) || (tag.prompt?.toLowerCase() || '').includes(q)) {
              results.push({
                ...tag,
                _path: `${cat.name} > ${grp.name}`,
                _color: grp.color,
                _catIdx: cIdx,
                _grpIdx: gIdx
              });
            }
          });
        });
      });
      return results;
    }

    return activeGroup?.tagList?.filter(tag => 
      (tag.label?.toLowerCase() || '').includes(q) || 
      (tag.prompt?.toLowerCase() || '').includes(q)
    ) || [];
  }, [data, activeGroup, searchQuery, searchMode]);

  // 初期読み込み中、またはデータがない場合の画面
  if (!isDataLoaded && data.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f1117]">
        <div className="text-center animate-fade-in glass p-12 rounded-[2rem] border max-w-lg">
          {loadError ? (
            <AlertCircle className="mb-6 mx-auto text-red-400" size={80} />
          ) : (
            <FileUp className="mb-6 mx-auto text-indigo-400 opacity-80" size={80} />
          )}
          <h1 className="text-3xl font-extrabold mb-4">
            {loadError ? '読み込みエラー' : 'YAML エディタへようこそ'}
          </h1>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            {loadError || '設定ファイル (prepend.yaml) を直接選択するか、読み込んで開始してください。'}
          </p>
          <div 
            className={`flex flex-col gap-4 landing-card p-6 rounded-3xl ${isDraggingLanding ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, 'landing')}
            onDragLeave={(e) => handleDragLeave(e, 'landing')}
            onDrop={(e) => handleDrop(e, 'landing')}
          >
            <label className="btn-primary cursor-pointer flex items-center justify-center gap-3">
              <Upload size={24} />
              YAMLファイルを開く
              <input type="file" className="hidden-input" accept=".yaml,.yml" onChange={handleFileUpload} />
            </label>
            {!loadError && (
              <p className="text-xs text-gray-500 mt-2">
                ※ ここにファイルをドロップして開くこともできます
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="flex min-h-screen w-full bg-[#0f1117] text-white font-sans app-container">
        {/* Sidebar */}
        <aside className="w-96 flex-shrink-0 sidebar border-r border-white/5 flex flex-col z-10 glass">
          <div className="p-8 border-b border-white/5 flex flex-col gap-6">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              YAML Editor
            </h1>
            <div className="flex gap-4">
              <label 
                className={`btn-secondary flex-1 ${isDraggingSidebar ? 'drag-over' : ''}`} 
                title="YAMLを読み込む"
                onDragOver={(e) => handleDragOver(e, 'sidebar')}
                onDragLeave={(e) => handleDragLeave(e, 'sidebar')}
                onDrop={(e) => handleDrop(e, 'sidebar')}
              >
                <Upload size={20} />
                <span>開く</span>
                <input type="file" className="hidden-input" accept=".yaml,.yml" onChange={handleFileUpload} />
              </label>
              <button 
                onClick={handleSave}
                className="btn-secondary flex-1 bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                title="保存（バックアップ同時作成）"
              >
                <Save size={20} />
                <span>保存</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            <SortableContext items={data.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {data.map((cat, catIdx) => (
                <div key={cat.id} className="space-y-1">
                  <SidebarItem 
                    id={cat.id}
                    name={cat.name}
                    isActive={activeCategoryIndex === catIdx}
                    onDelete={() => deleteCategory(catIdx)}
                    onAddSub={() => addGroup(catIdx)}
                    onRename={(newName) => {
                      const newData = [...data];
                      newData[catIdx].name = newName;
                      setData(newData);
                    }}
                    onClick={() => {
                      setActiveCategoryIndex(catIdx);
                      setActiveGroupIndex(0);
                    }}
                  />
                  <AnimatePresence>
                    {activeCategoryIndex === catIdx && cat.groups && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="sub-items"
                      >
                        <SortableContext items={cat.groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                          {cat.groups.map((group, grpIdx) => (
                            <SidebarItem 
                              key={group.id}
                              id={group.id}
                              name={group.name}
                              color={group.color}
                              isSubItem
                              isActive={activeGroupIndex === grpIdx}
                              onDelete={() => deleteGroup(catIdx, grpIdx)}
                              onRename={(newName) => {
                                const newData = [...data];
                                newData[catIdx].groups[grpIdx].name = newName;
                                setData(newData);
                              }}
                              onClick={() => {
                                setActiveCategoryIndex(catIdx);
                                setActiveGroupIndex(grpIdx);
                              }}
                            />
                          ))}
                        </SortableContext>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </SortableContext>
          <button 
            onClick={addCategory}
            className="w-full flex items-center justify-center gap-3 p-4 mt-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-gray-400 hover:text-indigo-400 transition-all font-bold"
          >
            <FolderPlus size={22} />
            カテゴリを追加
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full flex flex-col relative">
        <header className="main-header glass">
          <div className="header-info">
            <div className="flex flex-col">
              <h2 className="text-4xl font-extrabold tracking-tight mb-2">
                {searchMode === 'global' && searchQuery ? '全体検索結果' : (activeGroup?.name || '選択してください')}
              </h2>
              <div className="flex items-center gap-3 text-lg text-gray-400 font-medium h-7">
                {!(searchMode === 'global' && searchQuery) && activeGroup && (
                  <>
                    <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg text-sm">{activeCategory?.name}</span>
                    <ChevronRight size={18} />
                    <span>{activeGroup?.name}</span>
                  </>
                )}
                {searchMode === 'global' && searchQuery && (
                  <span>全カテゴリ・グループからの抽出結果</span>
                )}
              </div>
            </div>
            {activeGroup && !(searchMode === 'global' && searchQuery) && (
              <div className="color-control relative ml-6">
                <button 
                  onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                  className="palette-btn"
                  style={{ 
                    backgroundColor: 'white',
                    backgroundImage: `linear-gradient(${activeGroup.color}, ${activeGroup.color})`,
                    color: getContrastColor(activeGroup.color)
                  }}
                >
                  <Palette size={32} />
                </button>
                {isColorPickerOpen && (
                  <div className="absolute top-20 left-0 z-50 glass p-8 rounded-[2.5rem] animate-fade-in shadow-2xl border border-white/20 w-[360px]">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg">カラー設定</h3>
                      {window.EyeDropper && (
                        <button 
                          onClick={handleEyeDropper}
                          className="icon-btn bg-white/10 text-indigo-300 hover:bg-indigo-500/20"
                          title="画面から色を取得"
                        >
                          <Pipette size={24} />
                        </button>
                      )}
                    </div>

                    <RgbaColorPicker 
                      color={rgbaToObj(activeGroup.color || 'rgba(255,255,255,1)')} 
                      onChange={updateGroupColor} 
                    />
                    
                    <div className="rgba-inputs">
                      {['r', 'g', 'b', 'a'].map(key => (
                        <div key={key} className="rgba-input-group">
                          <label className="rgba-input-label">{key}</label>
                          <input 
                            type="number"
                            min={key === 'a' ? 0 : 0}
                            max={key === 'a' ? 1 : 255}
                            step={key === 'a' ? 0.05 : 1}
                            value={rgbaToObj(activeGroup.color)[key]}
                            onChange={(e) => handleColorInputChange(key, e.target.value, activeGroup.color)}
                            className="rgba-input"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 flex items-center justify-between gap-6 border-t border-white/10 pt-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[0.65rem] font-black text-gray-500 uppercase tracking-widest">Current RGBA</span>
                        <code className="text-sm bg-black/40 px-3 py-1.5 rounded-lg font-mono text-indigo-300 border border-white/5">
                          {activeGroup.color}
                        </code>
                      </div>
                      <button 
                        onClick={() => setIsColorPickerOpen(false)}
                        className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-600/40 hover:bg-indigo-500 transition-all active:scale-95"
                      >
                        <Check size={28} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="header-actions">
            <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10 mr-2">
              <button 
                onClick={() => setSearchMode('local')}
                className={`py-2 px-4 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${searchMode === 'local' ? 'bg-indigo-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="現在のグループ内を検索"
              >
                <Folders size={16} />
                現在
              </button>
              <button 
                onClick={() => setSearchMode('global')}
                className={`py-2 px-4 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${searchMode === 'global' ? 'bg-indigo-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="ファイル全体を検索"
              >
                <Globe size={16} />
                全体
              </button>
            </div>
            <div className="relative search-box">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
              <input 
                type="text" 
                placeholder="タグを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={addTag}
              className="btn-primary flex items-center gap-3"
            >
              <Plus size={28} />
              タグを追加
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 scrollbar-hide">
          {searchMode === 'global' && searchQuery ? (
            <div className="card-grid">
              <SortableContext items={filteredTags.map(t => t.id)} strategy={rectSortingStrategy}>
                <AnimatePresence>
                  {filteredTags.map((tag) => (
                  <TagCard 
                    key={tag.id}
                    id={tag.id}
                    prompt={tag.prompt}
                    label={tag.label}
                    color={tag._color}
                    path={tag._path}
                    existingPrompts={data[tag._catIdx].groups[tag._grpIdx].tagList.filter(t => t.id !== tag.id).map(t => t.prompt)}
                    onUpdate={(updates) => updateTag(tag.id, updates, tag._catIdx, tag._grpIdx)}
                    onDelete={() => deleteTag(tag.id, tag._catIdx, tag._grpIdx)}
                    onTranslate={() => translateText(tag.prompt).then(lab => updateTag(tag.id, { label: lab }, tag._catIdx, tag._grpIdx))}
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
          </div>
        ) : (
            <>
              {activeGroup && (
                <div className="card-grid">
                  <SortableContext items={filteredTags.map(t => t.id)} strategy={rectSortingStrategy}>
                    <AnimatePresence>
                      {filteredTags.map((tag) => (
                        <TagCard 
                          key={tag.id}
                          id={tag.id}
                          prompt={tag.prompt}
                          label={tag.label}
                          color={activeGroup.color}
                          existingPrompts={activeGroup.tagList.filter(t => t.id !== tag.id).map(t => t.prompt)}
                          onUpdate={(updates) => updateTag(tag.id, updates)}
                          onDelete={() => deleteTag(tag.id)}
                          onTranslate={() => translateText(tag.prompt).then(lab => updateTag(tag.id, { label: lab }))}
                        />
                      ))}
                    </AnimatePresence>
                  </SortableContext>
                </div>
              )}
              {!activeGroup && (
                <div className="h-full flex items-center justify-center text-gray-500 italic text-xl">
                  左のサイドバーからグループを選択してください
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
    <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
      {activeDragId ? (
        activeDragId.toString().startsWith('tag-') ? (
          <div className="pointer-events-none glass tag-card p-6 rounded-2xl border border-indigo-400 bg-[#0f1117]/90 flex flex-col items-start justify-center shadow-2xl backdrop-blur-md min-w-[200px]">
            <span className="font-bold text-sm text-indigo-300">タグを移動中...</span>
          </div>
        ) : (
          <div className="pointer-events-none bg-indigo-500/90 text-white p-3 rounded-xl shadow-2xl backdrop-blur-md border border-white/20 min-w-[150px]">
            <span className="font-bold text-sm">グループを移動中...</span>
          </div>
        )
      ) : null}
    </DragOverlay>
    </DndContext>
  );
}
