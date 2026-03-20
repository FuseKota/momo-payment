/**
 * 臺灣 3 碼郵遞區號 → 縣市／鄉鎮市區 對應表
 * 資料來源：中華郵政全國郵遞區號一覽表
 *
 * Export:
 *   TW_ZIPCODE_MAP  – Record<string, { county: string; district: string }>
 *   lookupTwZipcode  – (zipcode: string) => { county: string; district: string } | null
 */

export const TW_ZIPCODE_MAP: Record<string, { county: string; district: string }> = {
  // ──────────────────────────────────────────────
  // 臺北市 (100-116)
  // ──────────────────────────────────────────────
  '100': { county: '臺北市', district: '中正區' },
  '103': { county: '臺北市', district: '大同區' },
  '104': { county: '臺北市', district: '中山區' },
  '105': { county: '臺北市', district: '松山區' },
  '106': { county: '臺北市', district: '大安區' },
  '108': { county: '臺北市', district: '萬華區' },
  '110': { county: '臺北市', district: '信義區' },
  '111': { county: '臺北市', district: '士林區' },
  '112': { county: '臺北市', district: '北投區' },
  '114': { county: '臺北市', district: '內湖區' },
  '115': { county: '臺北市', district: '南港區' },
  '116': { county: '臺北市', district: '文山區' },

  // ──────────────────────────────────────────────
  // 基隆市 (200-206)
  // ──────────────────────────────────────────────
  '200': { county: '基隆市', district: '仁愛區' },
  '201': { county: '基隆市', district: '信義區' },
  '202': { county: '基隆市', district: '中正區' },
  '203': { county: '基隆市', district: '中山區' },
  '204': { county: '基隆市', district: '安樂區' },
  '205': { county: '基隆市', district: '暖暖區' },
  '206': { county: '基隆市', district: '七堵區' },

  // ──────────────────────────────────────────────
  // 連江縣 (209-212)
  // ──────────────────────────────────────────────
  '209': { county: '連江縣', district: '南竿鄉' },
  '210': { county: '連江縣', district: '北竿鄉' },
  '211': { county: '連江縣', district: '莒光鄉' },
  '212': { county: '連江縣', district: '東引鄉' },

  // ──────────────────────────────────────────────
  // 新北市 (207-208, 220-253)
  // ──────────────────────────────────────────────
  '207': { county: '新北市', district: '萬里區' },
  '208': { county: '新北市', district: '金山區' },
  '220': { county: '新北市', district: '板橋區' },
  '221': { county: '新北市', district: '汐止區' },
  '222': { county: '新北市', district: '深坑區' },
  '223': { county: '新北市', district: '石碇區' },
  '224': { county: '新北市', district: '瑞芳區' },
  '226': { county: '新北市', district: '平溪區' },
  '227': { county: '新北市', district: '雙溪區' },
  '228': { county: '新北市', district: '貢寮區' },
  '231': { county: '新北市', district: '新店區' },
  '232': { county: '新北市', district: '坪林區' },
  '233': { county: '新北市', district: '烏來區' },
  '234': { county: '新北市', district: '永和區' },
  '235': { county: '新北市', district: '中和區' },
  '236': { county: '新北市', district: '土城區' },
  '237': { county: '新北市', district: '三峽區' },
  '238': { county: '新北市', district: '樹林區' },
  '239': { county: '新北市', district: '鶯歌區' },
  '241': { county: '新北市', district: '三重區' },
  '242': { county: '新北市', district: '新莊區' },
  '243': { county: '新北市', district: '泰山區' },
  '244': { county: '新北市', district: '林口區' },
  '247': { county: '新北市', district: '蘆洲區' },
  '248': { county: '新北市', district: '五股區' },
  '249': { county: '新北市', district: '八里區' },
  '251': { county: '新北市', district: '淡水區' },
  '252': { county: '新北市', district: '三芝區' },
  '253': { county: '新北市', district: '石門區' },

  // ──────────────────────────────────────────────
  // 宜蘭縣 (260-272)
  // ──────────────────────────────────────────────
  '260': { county: '宜蘭縣', district: '宜蘭市' },
  '261': { county: '宜蘭縣', district: '頭城鎮' },
  '262': { county: '宜蘭縣', district: '礁溪鄉' },
  '263': { county: '宜蘭縣', district: '壯圍鄉' },
  '264': { county: '宜蘭縣', district: '員山鄉' },
  '265': { county: '宜蘭縣', district: '羅東鎮' },
  '266': { county: '宜蘭縣', district: '三星鄉' },
  '267': { county: '宜蘭縣', district: '大同鄉' },
  '268': { county: '宜蘭縣', district: '五結鄉' },
  '269': { county: '宜蘭縣', district: '冬山鄉' },
  '270': { county: '宜蘭縣', district: '蘇澳鎮' },
  '272': { county: '宜蘭縣', district: '南澳鄉' },

  // ──────────────────────────────────────────────
  // 新竹市 (300)
  // ──────────────────────────────────────────────
  // 新竹市東區・北區は同一郵遞區號 300
  '300': { county: '新竹市', district: '東區' },

  // ──────────────────────────────────────────────
  // 新竹縣 (302-315)
  // ──────────────────────────────────────────────
  '302': { county: '新竹縣', district: '竹北市' },
  '303': { county: '新竹縣', district: '湖口鄉' },
  '304': { county: '新竹縣', district: '新豐鄉' },
  '305': { county: '新竹縣', district: '新埔鎮' },
  '306': { county: '新竹縣', district: '關西鎮' },
  '307': { county: '新竹縣', district: '芎林鄉' },
  '308': { county: '新竹縣', district: '寶山鄉' },
  '310': { county: '新竹縣', district: '竹東鎮' },
  '311': { county: '新竹縣', district: '五峰鄉' },
  '312': { county: '新竹縣', district: '橫山鄉' },
  '313': { county: '新竹縣', district: '尖石鄉' },
  '314': { county: '新竹縣', district: '北埔鄉' },
  '315': { county: '新竹縣', district: '峨眉鄉' },

  // ──────────────────────────────────────────────
  // 桃園市 (320-338)
  // ──────────────────────────────────────────────
  '320': { county: '桃園市', district: '中壢區' },
  '324': { county: '桃園市', district: '平鎮區' },
  '325': { county: '桃園市', district: '龍潭區' },
  '326': { county: '桃園市', district: '楊梅區' },
  '327': { county: '桃園市', district: '新屋區' },
  '328': { county: '桃園市', district: '觀音區' },
  '330': { county: '桃園市', district: '桃園區' },
  '333': { county: '桃園市', district: '龜山區' },
  '334': { county: '桃園市', district: '八德區' },
  '335': { county: '桃園市', district: '大溪區' },
  '336': { county: '桃園市', district: '復興區' },
  '337': { county: '桃園市', district: '大園區' },
  '338': { county: '桃園市', district: '蘆竹區' },

  // ──────────────────────────────────────────────
  // 苗栗縣 (350-369)
  // ──────────────────────────────────────────────
  '350': { county: '苗栗縣', district: '竹南鎮' },
  '351': { county: '苗栗縣', district: '頭份市' },
  '352': { county: '苗栗縣', district: '三灣鄉' },
  '353': { county: '苗栗縣', district: '南庄鄉' },
  '354': { county: '苗栗縣', district: '獅潭鄉' },
  '356': { county: '苗栗縣', district: '後龍鎮' },
  '357': { county: '苗栗縣', district: '通霄鎮' },
  '358': { county: '苗栗縣', district: '苑裡鎮' },
  '360': { county: '苗栗縣', district: '苗栗市' },
  '361': { county: '苗栗縣', district: '造橋鄉' },
  '362': { county: '苗栗縣', district: '頭屋鄉' },
  '363': { county: '苗栗縣', district: '公館鄉' },
  '364': { county: '苗栗縣', district: '大湖鄉' },
  '365': { county: '苗栗縣', district: '泰安鄉' },
  '366': { county: '苗栗縣', district: '銅鑼鄉' },
  '367': { county: '苗栗縣', district: '三義鄉' },
  '368': { county: '苗栗縣', district: '西湖鄉' },
  '369': { county: '苗栗縣', district: '卓蘭鎮' },

  // ──────────────────────────────────────────────
  // 臺中市 (400-439)
  // ──────────────────────────────────────────────
  '400': { county: '臺中市', district: '中區' },
  '401': { county: '臺中市', district: '東區' },
  '402': { county: '臺中市', district: '南區' },
  '403': { county: '臺中市', district: '西區' },
  '404': { county: '臺中市', district: '北區' },
  '406': { county: '臺中市', district: '北屯區' },
  '407': { county: '臺中市', district: '西屯區' },
  '408': { county: '臺中市', district: '南屯區' },
  '411': { county: '臺中市', district: '太平區' },
  '412': { county: '臺中市', district: '大里區' },
  '413': { county: '臺中市', district: '霧峰區' },
  '414': { county: '臺中市', district: '烏日區' },
  '420': { county: '臺中市', district: '豐原區' },
  '421': { county: '臺中市', district: '后里區' },
  '422': { county: '臺中市', district: '石岡區' },
  '423': { county: '臺中市', district: '東勢區' },
  '424': { county: '臺中市', district: '和平區' },
  '426': { county: '臺中市', district: '新社區' },
  '427': { county: '臺中市', district: '潭子區' },
  '428': { county: '臺中市', district: '大雅區' },
  '429': { county: '臺中市', district: '神岡區' },
  '432': { county: '臺中市', district: '大肚區' },
  '433': { county: '臺中市', district: '沙鹿區' },
  '434': { county: '臺中市', district: '龍井區' },
  '435': { county: '臺中市', district: '梧棲區' },
  '436': { county: '臺中市', district: '清水區' },
  '437': { county: '臺中市', district: '大甲區' },
  '438': { county: '臺中市', district: '外埔區' },
  '439': { county: '臺中市', district: '大安區' },

  // ──────────────────────────────────────────────
  // 彰化縣 (500-530)
  // ──────────────────────────────────────────────
  '500': { county: '彰化縣', district: '彰化市' },
  '502': { county: '彰化縣', district: '芬園鄉' },
  '503': { county: '彰化縣', district: '花壇鄉' },
  '504': { county: '彰化縣', district: '秀水鄉' },
  '505': { county: '彰化縣', district: '鹿港鎮' },
  '506': { county: '彰化縣', district: '福興鄉' },
  '507': { county: '彰化縣', district: '線西鄉' },
  '508': { county: '彰化縣', district: '和美鎮' },
  '509': { county: '彰化縣', district: '伸港鄉' },
  '510': { county: '彰化縣', district: '員林市' },
  '511': { county: '彰化縣', district: '社頭鄉' },
  '512': { county: '彰化縣', district: '永靖鄉' },
  '513': { county: '彰化縣', district: '埔心鄉' },
  '514': { county: '彰化縣', district: '溪湖鎮' },
  '515': { county: '彰化縣', district: '大村鄉' },
  '516': { county: '彰化縣', district: '埔鹽鄉' },
  '520': { county: '彰化縣', district: '田中鎮' },
  '521': { county: '彰化縣', district: '北斗鎮' },
  '522': { county: '彰化縣', district: '田尾鄉' },
  '523': { county: '彰化縣', district: '埤頭鄉' },
  '524': { county: '彰化縣', district: '溪州鄉' },
  '525': { county: '彰化縣', district: '竹塘鄉' },
  '526': { county: '彰化縣', district: '二林鎮' },
  '527': { county: '彰化縣', district: '大城鄉' },
  '528': { county: '彰化縣', district: '芳苑鄉' },
  '530': { county: '彰化縣', district: '二水鄉' },

  // ──────────────────────────────────────────────
  // 南投縣 (540-558)
  // ──────────────────────────────────────────────
  '540': { county: '南投縣', district: '南投市' },
  '541': { county: '南投縣', district: '中寮鄉' },
  '542': { county: '南投縣', district: '草屯鎮' },
  '544': { county: '南投縣', district: '國姓鄉' },
  '545': { county: '南投縣', district: '埔里鎮' },
  '546': { county: '南投縣', district: '仁愛鄉' },
  '551': { county: '南投縣', district: '名間鄉' },
  '552': { county: '南投縣', district: '集集鎮' },
  '553': { county: '南投縣', district: '水里鄉' },
  '555': { county: '南投縣', district: '魚池鄉' },
  '556': { county: '南投縣', district: '信義鄉' },
  '557': { county: '南投縣', district: '竹山鎮' },
  '558': { county: '南投縣', district: '鹿谷鄉' },

  // ──────────────────────────────────────────────
  // 嘉義市 (600)
  // ──────────────────────────────────────────────
  '600': { county: '嘉義市', district: '西區' },
  // 嘉義市東區・西區は同一郵遞區號 600

  // ──────────────────────────────────────────────
  // 嘉義縣 (602-625)
  // ──────────────────────────────────────────────
  '602': { county: '嘉義縣', district: '番路鄉' },
  '603': { county: '嘉義縣', district: '梅山鄉' },
  '604': { county: '嘉義縣', district: '竹崎鄉' },
  '605': { county: '嘉義縣', district: '阿里山鄉' },
  '606': { county: '嘉義縣', district: '中埔鄉' },
  '607': { county: '嘉義縣', district: '大埔鄉' },
  '608': { county: '嘉義縣', district: '水上鄉' },
  '611': { county: '嘉義縣', district: '鹿草鄉' },
  '612': { county: '嘉義縣', district: '太保市' },
  '613': { county: '嘉義縣', district: '朴子市' },
  '614': { county: '嘉義縣', district: '東石鄉' },
  '615': { county: '嘉義縣', district: '六腳鄉' },
  '616': { county: '嘉義縣', district: '新港鄉' },
  '621': { county: '嘉義縣', district: '民雄鄉' },
  '622': { county: '嘉義縣', district: '大林鎮' },
  '623': { county: '嘉義縣', district: '溪口鄉' },
  '624': { county: '嘉義縣', district: '義竹鄉' },
  '625': { county: '嘉義縣', district: '布袋鎮' },

  // ──────────────────────────────────────────────
  // 雲林縣 (630-655)
  // ──────────────────────────────────────────────
  '630': { county: '雲林縣', district: '斗南鎮' },
  '631': { county: '雲林縣', district: '大埤鄉' },
  '632': { county: '雲林縣', district: '虎尾鎮' },
  '633': { county: '雲林縣', district: '土庫鎮' },
  '634': { county: '雲林縣', district: '褒忠鄉' },
  '635': { county: '雲林縣', district: '東勢鄉' },
  '636': { county: '雲林縣', district: '臺西鄉' },
  '637': { county: '雲林縣', district: '崙背鄉' },
  '638': { county: '雲林縣', district: '麥寮鄉' },
  '640': { county: '雲林縣', district: '斗六市' },
  '643': { county: '雲林縣', district: '林內鄉' },
  '646': { county: '雲林縣', district: '古坑鄉' },
  '647': { county: '雲林縣', district: '莿桐鄉' },
  '648': { county: '雲林縣', district: '西螺鎮' },
  '649': { county: '雲林縣', district: '二崙鄉' },
  '651': { county: '雲林縣', district: '北港鎮' },
  '652': { county: '雲林縣', district: '水林鄉' },
  '653': { county: '雲林縣', district: '口湖鄉' },
  '654': { county: '雲林縣', district: '四湖鄉' },
  '655': { county: '雲林縣', district: '元長鄉' },

  // ──────────────────────────────────────────────
  // 臺南市 (700-745)
  // ──────────────────────────────────────────────
  '700': { county: '臺南市', district: '中西區' },
  '701': { county: '臺南市', district: '東區' },
  '702': { county: '臺南市', district: '南區' },
  '704': { county: '臺南市', district: '北區' },
  '708': { county: '臺南市', district: '安平區' },
  '709': { county: '臺南市', district: '安南區' },
  '710': { county: '臺南市', district: '永康區' },
  '711': { county: '臺南市', district: '歸仁區' },
  '712': { county: '臺南市', district: '新化區' },
  '713': { county: '臺南市', district: '左鎮區' },
  '714': { county: '臺南市', district: '玉井區' },
  '715': { county: '臺南市', district: '楠西區' },
  '716': { county: '臺南市', district: '南化區' },
  '717': { county: '臺南市', district: '仁德區' },
  '718': { county: '臺南市', district: '關廟區' },
  '719': { county: '臺南市', district: '龍崎區' },
  '720': { county: '臺南市', district: '官田區' },
  '721': { county: '臺南市', district: '麻豆區' },
  '722': { county: '臺南市', district: '佳里區' },
  '723': { county: '臺南市', district: '西港區' },
  '724': { county: '臺南市', district: '七股區' },
  '725': { county: '臺南市', district: '將軍區' },
  '726': { county: '臺南市', district: '學甲區' },
  '727': { county: '臺南市', district: '北門區' },
  '730': { county: '臺南市', district: '新營區' },
  '731': { county: '臺南市', district: '鹽水區' },
  '732': { county: '臺南市', district: '白河區' },
  '733': { county: '臺南市', district: '柳營區' },
  '734': { county: '臺南市', district: '後壁區' },
  '735': { county: '臺南市', district: '東山區' },
  '736': { county: '臺南市', district: '六甲區' },
  '737': { county: '臺南市', district: '下營區' },
  '741': { county: '臺南市', district: '善化區' },
  '742': { county: '臺南市', district: '大內區' },
  '743': { county: '臺南市', district: '山上區' },
  '744': { county: '臺南市', district: '新市區' },
  '745': { county: '臺南市', district: '安定區' },

  // ──────────────────────────────────────────────
  // 高雄市 (800-852)
  // ──────────────────────────────────────────────
  '800': { county: '高雄市', district: '新興區' },
  '801': { county: '高雄市', district: '前金區' },
  '802': { county: '高雄市', district: '苓雅區' },
  '803': { county: '高雄市', district: '鹽埕區' },
  '804': { county: '高雄市', district: '鼓山區' },
  '805': { county: '高雄市', district: '旗津區' },
  '806': { county: '高雄市', district: '前鎮區' },
  '807': { county: '高雄市', district: '三民區' },
  '811': { county: '高雄市', district: '楠梓區' },
  '812': { county: '高雄市', district: '小港區' },
  '813': { county: '高雄市', district: '左營區' },
  '814': { county: '高雄市', district: '仁武區' },
  '815': { county: '高雄市', district: '大社區' },
  '820': { county: '高雄市', district: '岡山區' },
  '821': { county: '高雄市', district: '路竹區' },
  '822': { county: '高雄市', district: '阿蓮區' },
  '823': { county: '高雄市', district: '田寮區' },
  '824': { county: '高雄市', district: '燕巢區' },
  '825': { county: '高雄市', district: '橋頭區' },
  '826': { county: '高雄市', district: '梓官區' },
  '827': { county: '高雄市', district: '彌陀區' },
  '828': { county: '高雄市', district: '永安區' },
  '829': { county: '高雄市', district: '湖內區' },
  '830': { county: '高雄市', district: '鳳山區' },
  '831': { county: '高雄市', district: '大寮區' },
  '832': { county: '高雄市', district: '林園區' },
  '833': { county: '高雄市', district: '鳥松區' },
  '840': { county: '高雄市', district: '大樹區' },
  '842': { county: '高雄市', district: '旗山區' },
  '843': { county: '高雄市', district: '美濃區' },
  '844': { county: '高雄市', district: '六龜區' },
  '845': { county: '高雄市', district: '內門區' },
  '846': { county: '高雄市', district: '杉林區' },
  '847': { county: '高雄市', district: '甲仙區' },
  '848': { county: '高雄市', district: '桃源區' },
  '849': { county: '高雄市', district: '那瑪夏區' },
  '851': { county: '高雄市', district: '茂林區' },
  '852': { county: '高雄市', district: '茄萣區' },

  // ──────────────────────────────────────────────
  // 澎湖縣 (880-885)
  // ──────────────────────────────────────────────
  '880': { county: '澎湖縣', district: '馬公市' },
  '881': { county: '澎湖縣', district: '西嶼鄉' },
  '882': { county: '澎湖縣', district: '望安鄉' },
  '883': { county: '澎湖縣', district: '七美鄉' },
  '884': { county: '澎湖縣', district: '白沙鄉' },
  '885': { county: '澎湖縣', district: '湖西鄉' },

  // ──────────────────────────────────────────────
  // 金門縣 (890-896)
  // ──────────────────────────────────────────────
  '890': { county: '金門縣', district: '金沙鎮' },
  '891': { county: '金門縣', district: '金湖鎮' },
  '892': { county: '金門縣', district: '金寧鄉' },
  '893': { county: '金門縣', district: '金城鎮' },
  '894': { county: '金門縣', district: '烈嶼鄉' },
  '896': { county: '金門縣', district: '烏坵鄉' },

  // ──────────────────────────────────────────────
  // 屏東縣 (900-947)
  // ──────────────────────────────────────────────
  '900': { county: '屏東縣', district: '屏東市' },
  '901': { county: '屏東縣', district: '三地門鄉' },
  '902': { county: '屏東縣', district: '霧臺鄉' },
  '903': { county: '屏東縣', district: '瑪家鄉' },
  '904': { county: '屏東縣', district: '九如鄉' },
  '905': { county: '屏東縣', district: '里港鄉' },
  '906': { county: '屏東縣', district: '高樹鄉' },
  '907': { county: '屏東縣', district: '鹽埔鄉' },
  '908': { county: '屏東縣', district: '長治鄉' },
  '909': { county: '屏東縣', district: '麟洛鄉' },
  '911': { county: '屏東縣', district: '竹田鄉' },
  '912': { county: '屏東縣', district: '內埔鄉' },
  '913': { county: '屏東縣', district: '萬丹鄉' },
  '920': { county: '屏東縣', district: '潮州鎮' },
  '921': { county: '屏東縣', district: '泰武鄉' },
  '922': { county: '屏東縣', district: '來義鄉' },
  '923': { county: '屏東縣', district: '萬巒鄉' },
  '924': { county: '屏東縣', district: '崁頂鄉' },
  '925': { county: '屏東縣', district: '新埤鄉' },
  '926': { county: '屏東縣', district: '南州鄉' },
  '927': { county: '屏東縣', district: '林邊鄉' },
  '928': { county: '屏東縣', district: '東港鎮' },
  '929': { county: '屏東縣', district: '琉球鄉' },
  '931': { county: '屏東縣', district: '佳冬鄉' },
  '932': { county: '屏東縣', district: '新園鄉' },
  '940': { county: '屏東縣', district: '枋寮鄉' },
  '941': { county: '屏東縣', district: '枋山鄉' },
  '942': { county: '屏東縣', district: '春日鄉' },
  '943': { county: '屏東縣', district: '獅子鄉' },
  '944': { county: '屏東縣', district: '車城鄉' },
  '945': { county: '屏東縣', district: '牡丹鄉' },
  '946': { county: '屏東縣', district: '恆春鎮' },
  '947': { county: '屏東縣', district: '滿州鄉' },

  // ──────────────────────────────────────────────
  // 臺東縣 (950-966)
  // ──────────────────────────────────────────────
  '950': { county: '臺東縣', district: '臺東市' },
  '951': { county: '臺東縣', district: '綠島鄉' },
  '952': { county: '臺東縣', district: '蘭嶼鄉' },
  '953': { county: '臺東縣', district: '延平鄉' },
  '954': { county: '臺東縣', district: '卑南鄉' },
  '955': { county: '臺東縣', district: '鹿野鄉' },
  '956': { county: '臺東縣', district: '關山鎮' },
  '957': { county: '臺東縣', district: '海端鄉' },
  '958': { county: '臺東縣', district: '池上鄉' },
  '959': { county: '臺東縣', district: '東河鄉' },
  '961': { county: '臺東縣', district: '成功鎮' },
  '962': { county: '臺東縣', district: '長濱鄉' },
  '963': { county: '臺東縣', district: '太麻里鄉' },
  '964': { county: '臺東縣', district: '金峰鄉' },
  '965': { county: '臺東縣', district: '大武鄉' },
  '966': { county: '臺東縣', district: '達仁鄉' },

  // ──────────────────────────────────────────────
  // 花蓮縣 (970-983)
  // ──────────────────────────────────────────────
  '970': { county: '花蓮縣', district: '花蓮市' },
  '971': { county: '花蓮縣', district: '新城鄉' },
  '972': { county: '花蓮縣', district: '秀林鄉' },
  '973': { county: '花蓮縣', district: '吉安鄉' },
  '974': { county: '花蓮縣', district: '壽豐鄉' },
  '975': { county: '花蓮縣', district: '鳳林鎮' },
  '976': { county: '花蓮縣', district: '光復鄉' },
  '977': { county: '花蓮縣', district: '豐濱鄉' },
  '978': { county: '花蓮縣', district: '瑞穗鄉' },
  '979': { county: '花蓮縣', district: '萬榮鄉' },
  '981': { county: '花蓮縣', district: '玉里鎮' },
  '982': { county: '花蓮縣', district: '卓溪鄉' },
  '983': { county: '花蓮縣', district: '富里鄉' },
};

/**
 * 郵遞區號から縣市・鄉鎮市區を検索する
 * @param zipcode 3桁の郵遞區號（文字列）。5桁・6桁の場合は呼び出し側で先頭3桁を渡すこと。
 * @returns 該当する { county, district } or null
 */
export function lookupTwZipcode(
  zipcode: string,
): { county: string; district: string } | null {
  const normalized = zipcode.trim();
  return TW_ZIPCODE_MAP[normalized] ?? null;
}
