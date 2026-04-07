import yaml from 'js-yaml';

/**
 * prepend.yaml をパースして、React ステート用の配列構造に変換する
 */
export function parseYAML(yamlString) {
  try {
    const doc = yaml.load(yamlString);
    if (!doc || typeof doc !== 'object') return [];

    // トップレベルが配列の場合（ユーザーのリスト形式: [ { name: "cat1", groups: [...] } ]）
    if (Array.isArray(doc)) {
      return doc.map((cat, catIdx) => {
        const groups = (cat.groups || []).map((group, grpIdx) => {
          const tagList = Object.entries(group.tags || {}).map(([prompt, label], tagIdx) => ({
            id: `tag-${Date.now()}-${catIdx}-${grpIdx}-${tagIdx}-${Math.random().toString(36).substr(2, 5)}`,
            prompt,
            label
          }));

          return {
            id: group.id || `group-${Date.now()}-${catIdx}-${grpIdx}-${Math.random().toString(36).substr(2, 5)}`,
            name: group.name,
            color: group.color || 'rgba(99, 102, 241, 0.4)',
            tagList
          };
        });

        return {
          id: cat.id || `cat-${Date.now()}-${catIdx}-${Math.random().toString(36).substr(2, 5)}`,
          name: cat.name,
          groups
        };
      });
    } 
    
    // トップレベルがオブジェクトの場合（マップ形式: { cat1: { group1: { ... } } }）
    else {
      return Object.entries(doc).map(([catName, catContent], catIdx) => {
        const groups = Object.entries(catContent).map(([groupName, groupContent], grpIdx) => {
          const tagList = Object.entries(groupContent.tags || {}).map(([prompt, label], tagIdx) => ({
            id: `tag-${Date.now()}-${catIdx}-${grpIdx}-${tagIdx}-${Math.random().toString(36).substr(2, 5)}`,
            prompt,
            label
          }));

          return {
            id: `group-${Date.now()}-${catIdx}-${grpIdx}-${Math.random().toString(36).substr(2, 5)}`,
            name: groupName,
            color: groupContent.color || 'rgba(99, 102, 241, 0.4)',
            tagList
          };
        });

        return {
          id: `cat-${Date.now()}-${catIdx}-${Math.random().toString(36).substr(2, 5)}`,
          name: catName,
          groups
        };
      });
    }
  } catch (e) {
    console.error('YAML Parse Error:', e);
    return [];
  }
}

/**
 * 内部ステートを YAML 文字列に戻す（ユーザーに合わせて配列リスト形式で出力）
 */
export function stringifyYAML(data) {
  const output = data.map(cat => {
    return {
      name: cat.name,
      groups: cat.groups.map(group => {
        const tags = {};
        group.tagList.forEach(tag => {
          tags[tag.prompt] = tag.label;
        });
        return {
          name: group.name,
          color: group.color,
          tags
        };
      })
    };
  });

  return yaml.dump(output, { indent: 2, noRefs: true, lineWidth: -1 });
}

/**
 * 簡易翻訳プロキシ (MyMemory API)
 */
export async function translateText(text) {
  if (!text || text.trim() === '') return '';
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ja`);
    const data = await res.json();
    return data.responseData?.translatedText || text;
  } catch (e) {
    console.error('Translation error:', e);
    return text;
  }
}

/**
 * rgba(r, g, b, a) 文字列を {r, g, b, a} オブジェクトに変換
 */
export function rgbaToObj(rgba) {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return { r: 99, g: 102, b: 241, a: 0.4 };
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
    a: match[4] ? parseFloat(match[4]) : 1
  };
}

/**
 * {r, g, b, a} オブジェクトを rgba(r, g, b, a) 文字列に変換
 */
export function objToRgba(obj) {
  return `rgba(${obj.r}, ${obj.g}, ${obj.b}, ${obj.a.toFixed(2)})`;
}

/**
 * Hex 文字列を RGBA オブジェクトに変換 (スポイト用)
 */
export function hexToRgba(hex, alpha = 1) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return { r, g, b, a: alpha };
}

/**
 * RGBA 文字列から輝度を計算し、文字色（黒または白）を返す
 * 背景が白であることを考慮して計算する
 */
export function getContrastColor(rgba) {
  if (!rgba) return 'white';
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return 'white';
  
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  const a = match[4] ? parseFloat(match[4]) : 1;

  // 背景が白の場合の見かけの色（blended color）を計算
  const br = r * a + 255 * (1 - a);
  const bg = g * a + 255 * (1 - a);
  const bb = b * a + 255 * (1 - a);

  const brightness = (br * 299 + bg * 587 + bb * 114) / 1000;
  return brightness > 165 ? '#111827' : 'white';
}

