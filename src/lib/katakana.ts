/**
 * 英語色名 → カタカナ変換（日本語外来語表記準拠）
 *
 * 変換順序:
 *   1. WORD_MAP 完全一致（最優先）
 *   2. スペース/ハイフンで単語分割 → 各単語を WORD_MAP or フォネーム変換
 *   3. フォネーム: 4→3→2→1 文字の最長マッチ
 *
 * PAT 設計方針:
 *   - PAT4: 語尾パターン（-tion, -ight 等）
 *   - PAT3: 子音クラスター+母音（bla, gre 等）/ 子音+r/ar/er/or / C+oo
 *           ※ PAT2 より先にマッチするため、"bla"→ブラ が "bl"→ブル+"a"→ア に勝つ
 *   - PAT2: 母音ダイグラフ / 子音+母音ペア / 語末クラスター
 *   - PAT1: 1文字フォールバック
 */

// ─────────────────────────────────────────────────
// WORD_MAP（色名に登場しやすい英単語を収録）
// ─────────────────────────────────────────────────
const WORD_MAP: Record<string, string> = {
  // 基本色
  red: 'レッド', blue: 'ブルー', green: 'グリーン', yellow: 'イエロー',
  orange: 'オレンジ', purple: 'パープル', pink: 'ピンク', white: 'ホワイト',
  black: 'ブラック', gray: 'グレー', grey: 'グレー', brown: 'ブラウン',
  violet: 'バイオレット', indigo: 'インディゴ', cyan: 'シアン', magenta: 'マゼンタ',
  // 固有色
  coral: 'コーラル', teal: 'ティール', mint: 'ミント', rose: 'ローズ',
  lavender: 'ラベンダー', gold: 'ゴールド', silver: 'シルバー', cream: 'クリーム',
  ivory: 'アイボリー', beige: 'ベージュ', maroon: 'マルーン', navy: 'ネイビー',
  olive: 'オリーブ', khaki: 'カーキ', turquoise: 'ターコイズ', aqua: 'アクア',
  lime: 'ライム', amber: 'アンバー', crimson: 'クリムゾン', scarlet: 'スカーレット',
  fuchsia: 'フューシャ', mauve: 'モーブ', lilac: 'ライラック',
  periwinkle: 'ペリウィンクル', cobalt: 'コバルト', cerulean: 'セルリアン',
  ochre: 'オーカー', sienna: 'シエナ', umber: 'アンバー', tan: 'タン',
  salmon: 'サーモン', peach: 'ピーチ', apricot: 'アプリコット', lemon: 'レモン',
  chartreuse: 'シャルトルーズ', jade: 'ジェード', emerald: 'エメラルド',
  sage: 'セージ', forest: 'フォレスト', sky: 'スカイ', azure: 'アジュール',
  sapphire: 'サファイア', slate: 'スレート', steel: 'スティール',
  charcoal: 'チャコール', ebony: 'エボニー', obsidian: 'オブシディアン',
  smoke: 'スモーク', ash: 'アッシュ', bone: 'ボーン', snow: 'スノー',
  ice: 'アイス', frost: 'フロスト', mist: 'ミスト', dust: 'ダスト',
  stone: 'ストーン', sand: 'サンド', desert: 'デザート', blush: 'ブラッシュ',
  carmine: 'カーマイン', vermilion: 'バーミリオン', vermillion: 'バーミリオン',
  brick: 'ブリック', terracotta: 'テラコッタ', clay: 'クレイ', rust: 'ラスト',
  copper: 'カッパー', cognac: 'コニャック', mahogany: 'マホガニー',
  chestnut: 'チェスナット', walnut: 'ウォールナット', mocha: 'モカ',
  espresso: 'エスプレッソ', ecru: 'エクリュ', champagne: 'シャンパン',
  butter: 'バター', wheat: 'ウィート', fawn: 'フォーン', buff: 'バフ',
  vanilla: 'バニラ', mustard: 'マスタード', saffron: 'サフラン',
  canary: 'カナリー', corn: 'コーン', jasmine: 'ジャスミン',
  pistachio: 'ピスタチオ', fern: 'ファーン', pine: 'パイン',
  hunter: 'ハンター', jungle: 'ジャングル', army: 'アーミー', moss: 'モス',
  seafoam: 'シーフォーム', spearmint: 'スペアミント', peppermint: 'ペパーミント',
  viridian: 'ビリジアン', malachite: 'マラカイト', patina: 'パティナ',
  cornflower: 'コーンフラワー', denim: 'デニム', ultramarine: 'ウルトラマリン',
  prussian: 'プルシャン', cadet: 'カデット', powder: 'パウダー', baby: 'ベビー',
  alice: 'アリス', heather: 'ヘザー', orchid: 'オーキッド', plum: 'プラム',
  grape: 'グレープ', eggplant: 'エッグプラント', wisteria: 'ウィステリア',
  thistle: 'シスル', mulberry: 'マルベリー', raspberry: 'ラズベリー',
  flamingo: 'フラミンゴ', carnation: 'カーネーション', cerise: 'セリーズ',
  amaranth: 'アマランス', taupe: 'トープ', sepia: 'セピア',
  gunmetal: 'ガンメタル', platinum: 'プラチナ', chrome: 'クローム',
  onyx: 'オニキス', jet: 'ジェット', chalk: 'チョーク', linen: 'リネン',
  bisque: 'ビスク', moccasin: 'モカシン', almond: 'アーモンド',
  goldenrod: 'ゴールデンロッド', aquamarine: 'アクアマリン', opal: 'オパール',
  pearl: 'パール', ruby: 'ルビー', garnet: 'ガーネット', topaz: 'トパーズ',
  amethyst: 'アメジスト', diamond: 'ダイヤモンド', crystal: 'クリスタル',
  bronze: 'ブロンズ', brass: 'ブラス', iron: 'アイアン',
  titanium: 'チタニウム', tungsten: 'タングステン', pewter: 'ピューター',
  // 自然・環境
  midnight: 'ミッドナイト', shadow: 'シャドウ', sunset: 'サンセット',
  dawn: 'ドーン', dusk: 'ダスク', blood: 'ブラッド', fire: 'ファイア',
  water: 'ウォーター', earth: 'アース', wood: 'ウッド', grass: 'グラス',
  sea: 'シー', ocean: 'オーシャン', sun: 'サン', moon: 'ムーン',
  star: 'スター', cherry: 'チェリー', strawberry: 'ストロベリー',
  mango: 'マンゴー', honey: 'ハニー', caramel: 'キャラメル',
  chocolate: 'チョコレート', coffee: 'コーヒー', tea: 'ティー', wine: 'ワイン',
  electric: 'エレクトリック', space: 'スペース', storm: 'ストーム',
  glacier: 'グレイシャー', lightning: 'ライトニング', aurora: 'オーロラ',
  petal: 'ペタル', blossom: 'ブロッサム', bloom: 'ブルーム',
  meadow: 'メドウ', dune: 'デューン', cliff: 'クリフ',
  // 時間・季節
  morning: 'モーニング', evening: 'イブニング', noon: 'ヌーン', night: 'ナイト',
  winter: 'ウィンター', summer: 'サマー', autumn: 'オータム',
  spring: 'スプリング', sunrise: 'サンライズ', twilight: 'トワイライト',
  moonlight: 'ムーンライト', starlight: 'スターライト', sunlight: 'サンライト',
  horizon: 'ホライゾン', rainbow: 'レインボー',
  // 月・曜日
  january: 'ジャニュアリー', february: 'フェブラリー', march: 'マーチ',
  april: 'エイプリル', may: 'メイ', june: 'ジューン', july: 'ジュライ',
  august: 'オーガスト', september: 'セプテンバー', october: 'オクトーバー',
  november: 'ノベンバー', december: 'ディセンバー',
  monday: 'マンデー', tuesday: 'チューズデー', wednesday: 'ウェンズデー',
  thursday: 'サーズデー', friday: 'フライデー', saturday: 'サタデー', sunday: 'サンデー',
  // 水・地形
  pool: 'プール', lake: 'レイク', river: 'リバー', stream: 'ストリーム',
  harbor: 'ハーバー', bay: 'ベイ', shore: 'ショア', reef: 'リーフ',
  wave: 'ウェイブ', tide: 'タイド', foam: 'フォーム', spray: 'スプレー',
  // 方角・方位
  north: 'ノース', south: 'サウス', east: 'イースト', west: 'ウェスト',
  // ファンタジー・魔法
  mystic: 'ミスティック', magic: 'マジック', dream: 'ドリーム',
  fantasy: 'ファンタジー', legend: 'レジェンド', ancient: 'エンシェント',
  eternal: 'エターナル', sacred: 'セイクリッド', divine: 'ディヴァイン',
  celestial: 'セレスティアル', phantom: 'ファントム', spirit: 'スピリット',
  ghost: 'ゴースト', mystic2: 'ミスティック',
  // 感情・概念
  love: 'ラブ', heart: 'ハート', soul: 'ソウル', hope: 'ホープ',
  peace: 'ピース', grace: 'グレース', joy: 'ジョイ', bliss: 'ブリス',
  calm: 'カーム', sweet: 'スウィート', fair: 'フェア',
  gentle: 'ジェントル', tender: 'テンダー', serene: 'セリーン',
  // 動物
  robin: 'ロビン', sparrow: 'スパロウ', swan: 'スワン', dove: 'ダブ',
  raven: 'レイヴン', peacock: 'ピーコック', cardinal: 'カーディナル',
  finch: 'フィンチ', heron: 'ヘロン',
  // 植物・植生
  willow: 'ウィロウ', poplar: 'ポプラ', birch: 'バーチ',
  elder: 'エルダー', briar: 'ブライアー', spice: 'スパイス',
  herb: 'ハーブ', pollen: 'ポーレン', nectar: 'ネクター',
  // 形容詞・修飾語
  dark: 'ダーク', light: 'ライト', medium: 'ミディアム', bright: 'ブライト',
  pale: 'ペール', deep: 'ディープ', vivid: 'ビビッド', soft: 'ソフト',
  muted: 'ミューテッド', warm: 'ウォーム', cool: 'クール', bold: 'ボールド',
  pure: 'ピュア', clear: 'クリア', strong: 'ストロング', ultra: 'ウルトラ',
  super: 'スーパー', extra: 'エクストラ', neon: 'ネオン', hot: 'ホット',
  wild: 'ワイルド', shocking: 'ショッキング', royal: 'ロイヤル',
  rich: 'リッチ', true: 'トゥルー', old: 'オールド', new: 'ニュー',
  antique: 'アンティーク', raw: 'ロー', burnt: 'バーント',
  floral: 'フローラル', misty: 'ミスティ', pastel: 'パステル',
  fuzzy: 'ファジー', wuzzy: 'ワジー', mellow: 'メロー', jelly: 'ジェリー',
  berry: 'ベリー', candy: 'キャンディ', cotton: 'コットン',
  velvet: 'ベルベット', satin: 'サテン', silk: 'シルク', lace: 'レース',
  marble: 'マーブル', granite: 'グラナイト', metallic: 'メタリック',
  matte: 'マット', glossy: 'グロッシー', shiny: 'シャイニー',
  glitter: 'グリッター', sparkle: 'スパークル', glow: 'グロー',
  gleam: 'グリーム', shimmer: 'シマー',
  dew: 'デュー', rain: 'レイン', cloud: 'クラウド', fog: 'フォグ',
  haze: 'ヘイズ', steam: 'スティーム', wind: 'ウィンド', winds: 'ウィンズ',
  tulip: 'チューリップ', daisy: 'デイジー', iris: 'アイリス',
  poppy: 'ポピー', pansy: 'パンジー', clover: 'クローバー',
  bamboo: 'バンブー', cedar: 'シーダー', maple: 'メープル',
  hazel: 'ヘーゼル', sable: 'セーブル', drab: 'ドラブ', puce: 'ピュース',
  claret: 'クラレット', jam: 'ジャム', straw: 'ストロー', flax: 'フラックス',
  delft: 'デルフト', licorice: 'リコリス',
  eggshell: 'エッグシェル', alabaster: 'アラバスター',
  watermelon: 'ウォーターメロン', bubblegum: 'バブルガム',
  blueberry: 'ブルーベリー', blackberry: 'ブラックベリー',
  tangerine: 'タンジェリン', mandarin: 'マンダリン', papaya: 'パパイヤ',
  kiwi: 'キウイ', fig: 'フィグ', nectarine: 'ネクタリン',
  hibiscus: 'ハイビスカス', peony: 'ピオニー', dahlia: 'ダリア',
  magnolia: 'マグノリア',
  tomato: 'トマト', peru: 'ペルー', honeydew: 'ハニーデュー',
  seashell: 'シーシェル', xanadu: 'ザナドゥ',
  moby: 'モービー', dick: 'ディック', shine: 'シャイン',
  thunder: 'サンダー', tornado: 'トルネード', blizzard: 'ブリザード',
  hurricane: 'ハリケーン', sunbeam: 'サンビーム', moonbeam: 'ムーンビーム',
  golden: 'ゴールデン', smoky: 'スモーキー', dusty: 'ダスティ',
  earthy: 'アーシー', sandy: 'サンディ', woody: 'ウッディ',
  sunny: 'サニー', rainy: 'レイニー', windy: 'ウィンディ',
  stormy: 'ストーミー', icy: 'アイシー', frosty: 'フロスティ',
  jasper: 'ジャスパー', quartz: 'クォーツ', azurite: 'アズライト',
  cadmium: 'カドミウム', naples: 'ネープルス', payne: 'ペイン',
  smoked: 'スモークド', frosted: 'フロステッド', washed: 'ウォッシュド',
  aged: 'エイジド', faded: 'フェイデッド', cloudy: 'クラウディ',
  maya: 'マヤ', persian: 'ペルシャン', french: 'フレンチ',
  chinese: 'チャイニーズ', egyptian: 'エジプシャン', spring2: 'スプリング',
  // 人物・身体
  eye: 'アイ', lip: 'リップ', skin: 'スキン', hair: 'ヘア', nail: 'ネイル',
  cheek: 'チーク', face: 'フェイス', hand: 'ハンド', neck: 'ネック',
  boy: 'ボーイ', girl: 'ガール', man: 'マン', woman: 'ウーマン',
  child: 'チャイルド', king: 'キング', queen: 'クイーン',
  prince: 'プリンス', princess: 'プリンセス', lord: 'ロード', lady: 'レディ',
  angel: 'エンジェル', devil: 'デビル', fairy: 'フェアリー',
  knight: 'ナイト', hero: 'ヒーロー', witch: 'ウィッチ', warrior: 'ウォリアー',
  // 時間・順序
  time: 'タイム', hour: 'アワー',
  first: 'ファースト', second: 'セカンド', third: 'サード',
  fourth: 'フォース', fifth: 'フィフス',
  // 地形・場所
  island: 'アイランド', air: 'エア',
  valley: 'バレー', hill: 'ヒル', peak: 'ピーク',
  cape: 'ケープ', gulf: 'ガルフ', port: 'ポート',
  harbour: 'ハーバー', airport: 'エアポート',
  town: 'タウン', city: 'シティ', road: 'ロード',
  tower: 'タワー', bridge: 'ブリッジ', garden: 'ガーデン',
  park: 'パーク', field: 'フィールド', gate: 'ゲート',
  // サイズ・程度
  little: 'リトル', great: 'グレート', grand: 'グランド',
  high: 'ハイ', low: 'ロウ', long: 'ロング', short: 'ショート',
  wide: 'ワイド', tall: 'トール', thin: 'シン',
  full: 'フル', half: 'ハーフ', large: 'ラージ',
  // 動物（色名に登場しやすいもの）
  tiger: 'タイガー', lion: 'ライオン', bear: 'ベア', wolf: 'ウルフ',
  fox: 'フォックス', deer: 'ディア', eagle: 'イーグル', hawk: 'ホーク',
  cat: 'キャット', dog: 'ドッグ', horse: 'ホース', fish: 'フィッシュ',
  snake: 'スネイク', whale: 'ホエール', shark: 'シャーク',
  // 色調補助語
  hue: 'ヒュー', tone: 'トーン', tint: 'ティント', shade: 'シェード',
  chroma: 'クロマ', pigment: 'ピグメント', tinge: 'ティンジ',
  // マテリアル（追加）
  glass: 'グラス', metal: 'メタル', paper: 'ペーパー', leather: 'レザー',
  rock: 'ロック', rubber: 'ラバー',
  // サイレントe・ight 等、フォネーム変換で崩れやすい単語
  life: 'ライフ', side: 'サイド', ride: 'ライド', hide: 'ハイド',
  guide: 'ガイド', slide: 'スライド', glide: 'グライド', stride: 'ストライド',
  pride: 'プライド', bride: 'ブライド',
  dry: 'ドライ', fly: 'フライ', try: 'トライ', cry: 'クライ',
  shy: 'シャイ', dye: 'ダイ', tie: 'タイ', lie: 'ライ', die: 'ダイ',
  right: 'ライト', fight: 'ファイト', sight: 'サイト',
  might: 'マイト', tight: 'タイト', slight: 'スライト',
  glue: 'グルー', clue: 'クルー',
  wire: 'ワイヤー', tire: 'タイヤ', hire: 'ハイヤー',
  bow: 'ボウ', row: 'ロウ',
}

// ─────────────────────────────────────────────────
// PAT4: 4 文字パターン（優先：語尾・複合パターン）
// ─────────────────────────────────────────────────
const PAT4: Record<string, string> = {
  tion: 'ション', sion: 'ション', ture: 'チャー', ight: 'アイト',
  ough: 'オー',  augh: 'オー',  ique: 'イーク', eous: 'イアス',
  ious: 'イアス', ness: 'ネス', ment: 'メント', ance: 'アンス',
  ence: 'エンス', ling: 'リング', ring: 'リング', ting: 'ティング',
  ding: 'ディング', king: 'キング', ning: 'ニング', ming: 'ミング',
  ping: 'ピング', sing: 'シング', zing: 'ジング', wing: 'ウィング',
  ound: 'アウンド', ount: 'アウント',
}

// ─────────────────────────────────────────────────
// PAT3: 3 文字パターン
// 重要: 子音クラスター+母音は PAT2 の 2 文字クラスターより先にマッチ
// 例) "bla" → PAT3 ブラ  /  "bl" → PAT2 ブル（後者はフォールバック）
// ─────────────────────────────────────────────────
const PAT3: Record<string, string> = {
  // ── ch/sh/th/wh/ph + 母音 ──
  cha: 'チャ', che: 'チェ', chi: 'チ',  cho: 'チョ', chu: 'チュ',
  sha: 'シャ', she: 'シェ', shi: 'シ',  sho: 'ショ', shu: 'シュ',
  tha: 'ザ',  the: 'ザ',  thi: 'ジ',  tho: 'ゾ',  thu: 'ズ',
  wha: 'ワ',  whe: 'ウェ', whi: 'ウィ', who: 'フー', whu: 'ウ',
  pha: 'ファ', phe: 'フェ', phi: 'フィ', pho: 'フォ', phu: 'フ',
  // ── 特殊 3 文字 ──
  tch: 'ッチ', dge: 'ジ', que: 'ク', gue: 'グ', nce: 'ンス', nge: 'ンジ',
  age: 'エイジ', ght: 'ト',
  ble: 'ブル', ple: 'プル', tle: 'トル', dle: 'ドル', fle: 'フル',
  gle: 'グル', kle: 'クル', zle: 'ズル', sle: 'スル',
  ing: 'イング',
  // ── 子音クラスター + 母音（PAT2 の "bl"→ブル より優先） ──
  bla: 'ブラ', bli: 'ブリ', blo: 'ブロ', blu: 'ブル',
  bra: 'ブラ', bre: 'ブレ', bri: 'ブリ', bro: 'ブロ', bru: 'ブル',
  cla: 'クラ', cle: 'クレ', cli: 'クリ', clo: 'クロ', clu: 'クル',
  cra: 'クラ', cre: 'クレ', cri: 'クリ', cro: 'クロ', cru: 'クル',
  dra: 'ドラ', dre: 'ドレ', dri: 'ドリ', dro: 'ドロ', dru: 'ドル',
  fla: 'フラ', fli: 'フリ', flo: 'フロ', flu: 'フル',
  fra: 'フラ', fre: 'フレ', fri: 'フリ', fro: 'フロ', fru: 'フル',
  gla: 'グラ', gli: 'グリ', glo: 'グロ', glu: 'グル',
  gra: 'グラ', gre: 'グレ', gri: 'グリ', gro: 'グロ', gru: 'グル',
  pla: 'プラ', pli: 'プリ', plo: 'プロ', plu: 'プル',
  pra: 'プラ', pre: 'プレ', pri: 'プリ', pro: 'プロ', pru: 'プル',
  sla: 'スラ', sli: 'スリ', slo: 'スロ', slu: 'スル',
  sma: 'スマ', sme: 'スメ', smi: 'スミ', smo: 'スモ', smu: 'スム',
  sna: 'スナ', sne: 'スネ', sni: 'スニ', sno: 'スノ', snu: 'スヌ',
  spa: 'スパ', spe: 'スペ', spi: 'スピ', spo: 'スポ', spu: 'スプ',
  sta: 'スタ', ste: 'ステ', sti: 'スティ', sto: 'スト', stu: 'ストゥ',
  swa: 'スワ', swe: 'スウェ', swi: 'スウィ', swo: 'スウォ',
  tra: 'トラ', tre: 'トレ', tri: 'トリ', tro: 'トロ', tru: 'トル',
  stra: 'ストラ',
  // ── 子音 + oo（PAT2 の C+o より優先: pool→プール, cool→クール） ──
  boo: 'ブー', coo: 'クー', doo: 'ドゥー', foo: 'フー', goo: 'グー',
  hoo: 'フー', joo: 'ジュー', koo: 'クー', loo: 'ルー', moo: 'ムー',
  noo: 'ヌー', poo: 'プー', roo: 'ルー', soo: 'スー', too: 'トゥー',
  voo: 'ヴー', woo: 'ウー', yoo: 'ユー', zoo: 'ズー',
  // ── 子音 + ar（rhoticity: bar→バー, harbor→ハー+バー） ──
  bar: 'バー', car: 'カー', dar: 'ダー', far: 'ファー', gar: 'ガー',
  har: 'ハー', jar: 'ジャー', kar: 'カー', lar: 'ラー', mar: 'マー',
  nar: 'ナー', par: 'パー', rar: 'ラー', sar: 'サー', tar: 'ター',
  var: 'ヴァー', war: 'ウォー', yar: 'ヤー', zar: 'ザー',
  // ── 子音 + er（語末 -er → アー: silver→シルバー, winter→ウィンター） ──
  ber: 'バー', cer: 'サー', der: 'ダー', fer: 'ファー', ger: 'ガー',
  her: 'ハー', jer: 'ジャー', ker: 'カー', ler: 'ラー', mer: 'マー',
  ner: 'ナー', per: 'パー', rer: 'ラー', ser: 'ザー', ter: 'ター',
  ver: 'ヴァー', wer: 'ウァー', zer: 'ザー',
  // ── 子音 + or（語末 -or → オー: color→カラー, major→メジャー） ──
  bor: 'ボー', cor: 'コー', dor: 'ドー', 'for': 'フォー', gor: 'ゴー',
  hor: 'ホー', jor: 'ジョー', lor: 'ロー', mor: 'モー', nor: 'ノー',
  por: 'ポー', ror: 'ロー', sor: 'ソー', tor: 'トー', wor: 'ウォー', zor: 'ゾー',
  // ── mys, gys（my→マイ を避けて ミ にする） ──
  mys: 'ミス', gym: 'ジム', gys: 'ジス',
}

// ─────────────────────────────────────────────────
// PAT2: 2 文字パターン
// 優先度: 母音ダイグラフ → 母音+r/l/n → 語末クラスター → C+母音
// ─────────────────────────────────────────────────
const PAT2: Record<string, string> = {
  // ── 母音ダイグラフ（長音） ──
  aa: 'アー', ae: 'エイ', ai: 'エイ', ao: 'アオ', au: 'オー', aw: 'オー', ay: 'エイ',
  ea: 'イー', ee: 'イー', ei: 'エイ', eu: 'ユー', ew: 'ユー', ey: 'エイ',
  ia: 'イア', ie: 'アイ', io: 'イオ', iu: 'イウ',
  oa: 'オー', oe: 'オー', oi: 'オイ', oo: 'ウー', ou: 'アウ', ow: 'オウ', oy: 'オイ',
  ua: 'ウア', ue: 'ユー', ui: 'ウィ', uo: 'ウオ',
  // ── 母音 + r（rhoticity）→ 長音 ──
  er: 'アー', or: 'オー', ar: 'アー', ir: 'アー', ur: 'アー',
  // ── 母音 + l ──
  al: 'アル', el: 'エル', il: 'イル', ol: 'オル', ul: 'ウル',
  // ── 母音 + n ──
  an: 'アン', en: 'エン', in: 'イン', on: 'オン', un: 'アン',
  // ── 語末子音クラスター ──
  nd: 'ンド', nt: 'ント', nk: 'ンク', ng: 'ング', nc: 'ンス', ns: 'ンズ',
  st: 'スト', sk: 'スク', sp: 'スプ', sm: 'スム', sn: 'スン',
  ck: 'ック', ct: 'クト', lt: 'ルト', ld: 'ルド', lk: 'ルク', lm: 'ルム',
  lp: 'ルプ', lb: 'ルブ', lf: 'ルフ', lv: 'ルヴ',
  rk: 'ーク', rn: 'ーン', rm: 'ーム', rl: 'ール', rd: 'ード', rt: 'ート',
  rg: 'ーグ', rp: 'ープ', rb: 'ーブ', rf: 'ーフ', rs: 'ーズ',
  mp: 'ンプ', mb: 'ンブ', mf: 'ンフ',
  ft: 'フト', pt: 'プト', bt: 'ブト', xt: 'クスト',
  // ── 子音ダイグラフ ──
  ch: 'チ', sh: 'シュ', ph: 'フ', wh: 'ウ', th: 'ス',
  kn: 'ン', wr: 'ル', gn: 'ン', qu: 'クウ',
  // ── 子音 + 母音ペア ──
  ba: 'バ', be: 'ベ', bi: 'ビ', bo: 'ボ', bu: 'ブ', by: 'バイ',
  ca: 'カ', ce: 'セ', ci: 'シ', co: 'コ', cu: 'ク', cy: 'サイ',
  da: 'ダ', de: 'デ', di: 'ディ', do: 'ド', du: 'ドゥ', dy: 'ダイ',
  fa: 'ファ', fe: 'フェ', fi: 'フィ', fo: 'フォ', fu: 'フ', fy: 'ファイ',
  ga: 'ガ', ge: 'ゲ', gi: 'ジ', go: 'ゴ', gu: 'グ', gy: 'ジ', // gy→ジ（gym, gypsy等）
  ha: 'ハ', he: 'ヘ', hi: 'ヒ', ho: 'ホ', hu: 'ヒュ', hy: 'ハイ',
  ja: 'ジャ', je: 'ジェ', ji: 'ジ', jo: 'ジョ', ju: 'ジュ',
  ka: 'カ', ke: 'ケ', ki: 'キ', ko: 'コ', ku: 'ク', ky: 'キャ',
  la: 'ラ', le: 'レ', li: 'リ', lo: 'ロ', lu: 'ル', ly: 'リ',
  ma: 'マ', me: 'メ', mi: 'ミ', mo: 'モ', mu: 'ム', my: 'ミ', // my→ミ（mystic等）
  na: 'ナ', ne: 'ネ', ni: 'ニ', no: 'ノ', nu: 'ヌ', ny: 'ニャ',
  pa: 'パ', pe: 'ペ', pi: 'ピ', po: 'ポ', pu: 'プ', py: 'パイ',
  ra: 'ラ', re: 'レ', ri: 'リ', ro: 'ロ', ru: 'ル', ry: 'ライ',
  sa: 'サ', se: 'セ', si: 'シ', so: 'ソ', su: 'ス', sy: 'サイ',
  ta: 'タ', te: 'テ', ti: 'ティ', to: 'ト', tu: 'テュ', ty: 'タイ',
  va: 'ヴァ', ve: 'ヴェ', vi: 'ヴィ', vo: 'ヴォ', vu: 'ヴ',
  wa: 'ワ', we: 'ウェ', wi: 'ウィ', wo: 'ウォ', wu: 'ウ',
  xa: 'クサ', xe: 'クセ', xi: 'クシ', xo: 'クソ', xu: 'クス',
  ya: 'ヤ', ye: 'イェ', yi: 'イ', yo: 'ヨ', yu: 'ユ',
  za: 'ザ', ze: 'ゼ', zi: 'ジ', zo: 'ゾ', zu: 'ズ',
  // ── 子音クラスター フォールバック（母音が続かない場合） ──
  bl: 'ブル', br: 'ブル', cl: 'クル', cr: 'クル', dr: 'ドル',
  fl: 'フル', fr: 'フル', gl: 'グル', gr: 'グル',
  pl: 'プル', pr: 'プル', sc: 'スク', sl: 'スル',
  sw: 'スウ', tr: 'トル', tw: 'ツ',
}

// ─────────────────────────────────────────────────
// PAT1: 1 文字フォールバック
// ─────────────────────────────────────────────────
const PAT1: Record<string, string> = {
  a: 'ア', e: 'エ', i: 'イ', o: 'オ', u: 'ウ', y: 'ィ',
  b: 'ブ', c: 'ク', d: 'ド', f: 'フ', g: 'グ', h: 'ヒ',
  j: 'ジ', k: 'ク', l: 'ル', m: 'ム', n: 'ン', p: 'プ',
  q: 'ク', r: 'ル', s: 'ス', t: 'ト', v: 'ヴ', w: 'ウ',
  x: 'クス', z: 'ズ',
}

// ─────────────────────────────────────────────────
// 前処理
// ─────────────────────────────────────────────────
function preprocess(word: string): string {
  let w = word.toLowerCase()
  // ll/rr/ss → 縮退（日本語では重複しない）
  w = w.replace(/ll/g, 'l').replace(/rr/g, 'r').replace(/ss/g, 's')
  // それ以外の重複子音 → ッ + 1文字
  w = w.replace(/([bcdfgkptz])\1/g, 'ッ$1')
  return w
}

// ─────────────────────────────────────────────────
// フォネーム変換
// ─────────────────────────────────────────────────
function phoneticToKatakana(word: string): string {
  const w = preprocess(word)
  let result = ''
  let i = 0

  while (i < w.length) {
    const ch = w[i]

    if (ch === 'ッ') {
      result += 'ッ'
      i++
      continue
    }

    let matched = false
    for (const [len, table] of [
      [4, PAT4], [3, PAT3], [2, PAT2], [1, PAT1],
    ] as [number, Record<string, string>][]) {
      if (i + len > w.length) continue
      const chunk = w.slice(i, i + len)
      const kata = table[chunk]
      if (kata !== undefined) {
        result += kata
        i += len
        matched = true
        break
      }
    }

    if (!matched) i++
  }

  return result || word
}

// ─────────────────────────────────────────────────
// 公開 API
// ─────────────────────────────────────────────────
/**
 * 英語色名をカタカナに変換する（日本語外来語表記準拠）
 * @example "Coral Red"   → "コーラルレッド"
 * @example "Evening Star" → "イブニングスター"
 * @example "Pool Water"  → "プールウォーター"
 * @example "Mystic Harbor" → "ミスティックハーバー"
 */
export function toKatakana(englishName: string): string {
  const lower = englishName.toLowerCase().trim()

  // 完全一致（複合語含む）
  if (WORD_MAP[lower]) return WORD_MAP[lower]

  // スペース/ハイフン/アンダースコアで分割して各単語を変換
  const words = lower.split(/[\s\-_]+/)
  return words
    .map((w) => WORD_MAP[w] ?? phoneticToKatakana(w))
    .join('')
}
