// config.js
export const SUPABASE_URL = 'https://qvkhfueivkwdqydnhlsr.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_mXpXBbeHRecrahRlDxkDAQ_Xe3zyb5G';
export const GAS_URL = "https://script.google.com/macros/s/AKfycbxb2UW5ctVar9QhWmjI-IIFA1EOxDCovRDoNBcbN31x4L4-mCh1lGcF-ZdH-62pUrbR/exec";

export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export const tg = window.Telegram?.WebApp || null;

export const NOM_DICT = {
  to: {
    cifra: ["Основной товар GSM", "Основной товар Цифровая и оргтехника", "Основной товар Черная техника"],
    mbt: ["Основной товар МБТ"],
    kbt: ["Основной товар Белая техника", "Основной товар Кондиционеры"]
  },
  aks: {
    cifra: ["Сопутствующий товар GSM", "Сопутствующий товар Цифровая и оргтехника", "Сопутствующий товар Черная техника"],
    mbt: ["Сопутствующий товар МБТ"],
    kbt: ["Сопутствующий товар Белая техника"]
  },
  usl: {
    cifra: ["Услуга ESD", "Услуга IT", "Услуга TV", "Услуга ММС", "Услуга Настройка TV", "Услуга Онлайн-кинотеатр", "Услуга Сервис Плюс IT", "Услуга Сервис Плюс TV", "Услуги IT на ПК, ноутбуки и моноблоки", "Услуги IT на смартфоны и планшеты", "Услуги установки Черной техники", "Услуги электронные"],
    mbt: ["Услуга SDA"],
    kbt: ["Услуга MDA", "Услуга Сервис Плюс MDA", "Услуги установки Белой техники", "Услуги установки Кондиционеров"]
  }
};
