/** Crop names as published in the MAGyP estimations catalogue. */
export const MAGYP_CROPS = [
  'Ajo', 'Algodón', 'Alpiste', 'Arroz', 'Arveja', 'Avena', 'Banana', 'Caña de azúcar',
  'Cártamo', 'Cebada cervecera', 'Cebada forrajera', 'Cebada total', 'Cebolla total',
  'Centeno', 'Colza', 'Garbanzo', 'Girasol', 'Jojoba', 'Lenteja', 'Limón', 'Lino', 'Maíz',
  'Mandarina', 'Maní', 'Mijo', 'Naranja', 'Papa total', 'Pomelo', 'Poroto alubia',
  'Poroto negro', 'Poroto otros', 'Poroto total', 'Soja 1ra', 'Soja 2da', 'Soja total',
  'Sorgo', 'Té', 'Trigo candeal', 'Trigo total', 'Tung', 'Yerba mate'
] as const;

const aggregateGroups = [
  ['Cebada total', 'Cebada cervecera', 'Cebada forrajera'],
  ['Poroto total', 'Poroto alubia', 'Poroto negro', 'Poroto otros'],
  ['Soja total', 'Soja 1ra', 'Soja 2da'],
  ['Trigo total', 'Trigo candeal']
];

export function canAddMagypCrop(selected: string[], crop: string): boolean {
  if (selected.includes(crop)) return true;
  return !aggregateGroups.some(group => group.includes(crop) && group.some(item => item !== crop && selected.includes(item)));
}

export function removeConflictingMagypCrops(selected: string[], crop: string): string[] {
  const conflict = aggregateGroups.find(group => group.includes(crop));
  return [...selected.filter(item => item === crop || !conflict?.includes(item)), crop];
}
