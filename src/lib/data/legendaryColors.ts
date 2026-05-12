/**
 * Legendary Colors — ブランド・文化アイコンの HEX データベース
 * 照合は 100% 完全一致（大文字正規化済み）のみ。
 */

export interface LegendaryColor {
  hex: string          // #RRGGBB 大文字
  brand: string        // ブランド名
  description: string  // 一言説明（メモ自動フィル用）
  category: 'fashion' | 'food' | 'tech' | 'culture' | 'nature'
  imageUrl?: string    // ブランドロゴ URL（Clearbit等）
  url?: string         // 公式サイト / ブランドガイドライン URL
}

export const LEGENDARY_COLORS: LegendaryColor[] = [
  // ── Fashion & Luxury ──────────────────────────────────────────
  {
    hex: '#81D8D0',
    brand: 'Tiffany & Co.',
    description: '世界で最も有名なジュエリーブランドのアイコニックブルー',
    category: 'fashion',
    imageUrl: 'https://logo.clearbit.com/tiffany.com',
    url: 'https://www.tiffany.com',
  },
  {
    hex: '#F37021',
    brand: 'Hermès',
    description: 'フランスの高級メゾンを象徴するオレンジ',
    category: 'fashion',
    imageUrl: 'https://logo.clearbit.com/hermes.com',
    url: 'https://www.hermes.com',
  },
  {
    hex: '#C8A96E',
    brand: 'Burberry',
    description: 'バーバリーのトレードマーク、クラシックタン',
    category: 'fashion',
    imageUrl: 'https://logo.clearbit.com/burberry.com',
    url: 'https://www.burberry.com',
  },
  {
    hex: '#003087',
    brand: 'Chanel',
    description: 'シャネルのロイヤルブルー',
    category: 'fashion',
    imageUrl: 'https://logo.clearbit.com/chanel.com',
    url: 'https://www.chanel.com',
  },

  // ── Food & Beverage ───────────────────────────────────────────
  {
    hex: '#F40009',
    brand: 'Coca-Cola',
    description: '世界中で愛される、コカ・コーラの情熱的なレッド',
    category: 'food',
    imageUrl: 'https://logo.clearbit.com/coca-cola.com',
    url: 'https://www.coca-cola.com',
  },
  {
    hex: '#00704A',
    brand: 'Starbucks',
    description: 'スターバックスのシグネチャーグリーン',
    category: 'food',
    imageUrl: 'https://logo.clearbit.com/starbucks.com',
    url: 'https://www.starbucks.com',
  },
  {
    hex: '#FFC72C',
    brand: "McDonald's",
    description: 'マクドナルドの輝くゴールデンアーチ',
    category: 'food',
    imageUrl: 'https://logo.clearbit.com/mcdonalds.com',
    url: 'https://www.mcdonalds.com',
  },
  {
    hex: '#E31837',
    brand: "Kellogg's",
    description: 'ケロッグのシグネチャーレッド',
    category: 'food',
    imageUrl: 'https://logo.clearbit.com/kelloggs.com',
    url: 'https://www.kelloggs.com',
  },

  // ── Tech & Digital ────────────────────────────────────────────
  {
    hex: '#0A3ED8',
    brand: 'ColorPicker',
    description: 'あなた自身のアクセントカラー',
    category: 'tech',
  },
  {
    hex: '#1877F2',
    brand: 'Facebook / Meta',
    description: 'Metaのシグネチャーブルー',
    category: 'tech',
    imageUrl: 'https://logo.clearbit.com/meta.com',
    url: 'https://www.meta.com',
  },
  {
    hex: '#FF0000',
    brand: 'YouTube',
    description: 'YouTubeのアイコニックレッド',
    category: 'tech',
    imageUrl: 'https://logo.clearbit.com/youtube.com',
    url: 'https://www.youtube.com',
  },
  {
    hex: '#1DB954',
    brand: 'Spotify',
    description: 'Spotifyのシグネチャーグリーン',
    category: 'tech',
    imageUrl: 'https://logo.clearbit.com/spotify.com',
    url: 'https://www.spotify.com',
  },
  {
    hex: '#FF6719',
    brand: 'Soundcloud',
    description: 'SoundCloudのシグネチャーオレンジ',
    category: 'tech',
    imageUrl: 'https://logo.clearbit.com/soundcloud.com',
    url: 'https://www.soundcloud.com',
  },

  // ── Culture & Character ───────────────────────────────────────
  {
    hex: '#009EDB',
    brand: 'ドラえもん',
    description: '22世紀からやってきた青いロボット猫',
    category: 'culture',
  },
  {
    hex: '#FFE000',
    brand: 'ポケモン（ピカチュウ）',
    description: 'ピカチュウのトレードマーク、エレクトリックイエロー',
    category: 'culture',
    imageUrl: 'https://logo.clearbit.com/pokemon.com',
    url: 'https://www.pokemon.com',
  },
  {
    hex: '#E4000F',
    brand: 'Nintendo',
    description: '任天堂のシグネチャーレッド',
    category: 'culture',
    imageUrl: 'https://logo.clearbit.com/nintendo.com',
    url: 'https://www.nintendo.com',
  },
  {
    hex: '#003087',
    brand: 'IKEA',
    description: 'IKEAのスウェーデンブルー',
    category: 'culture',
    imageUrl: 'https://logo.clearbit.com/ikea.com',
    url: 'https://www.ikea.com',
  },

  // ── Nature & Science ──────────────────────────────────────────
  {
    hex: '#003153',
    brand: 'Prussian Blue',
    description: '最初の近代合成色素、プルシアンブルー（1704年）',
    category: 'nature',
  },
  {
    hex: '#E34234',
    brand: 'Vermilion',
    description: '古来から珍重される朱色、辰砂由来',
    category: 'nature',
  },
]

/**
 * HEX の完全一致照合（大文字正規化して比較）
 */
export function findLegendaryColor(hex: string): LegendaryColor | null {
  const normalized = hex.toUpperCase()
  return LEGENDARY_COLORS.find((c) => c.hex === normalized) ?? null
}
