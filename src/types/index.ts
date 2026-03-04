// 车企数据类型定义

// 月度销量数据
export interface MonthlySalesData {
  month: string;
  sales: number;
  company: string;
  year: number;
}

// 市场份额数据
export interface MarketShareData {
  company: string;
  share: number;
  color: string;
}

// 销量趋势数据
export interface SalesTrendData {
  month: string;
  [company: string]: number | string;
}

// 增长率数据
export interface GrowthRateData {
  month: string;
  year: number;
  company: string;
  yoyGrowth: number; // 同比增长
  momGrowth: number; // 环比增长
}

// 车企信息
export interface CarCompany {
  id: string;
  name: string;
  logo: string;
  color: string;
}

// 品牌信息
export interface CarBrand {
  id: string;
  name: string;
  manufacturer: string; // 厂商名称
}

// 品牌月度销量数据
export interface BrandMonthlySales {
  brand: string;
  manufacturer: string;
  month: string;
  sales: number;
  year: number;
}

// 车型详细数据（更新为用户要求的格式）
export interface CarModelData {
  manufacturer: string;  // 厂商名称
  brand: string;         // 品牌名称
  modelName: string;     // 型号名称
  vehicleType: string;   // 车辆类型
  energyType: string;    // 能源类型
  sales: number;         // 销量
  minPrice: number;      // 最低价格
  maxPrice: number;      // 最高价格
  month: string;         // 月份
  year: number;          // 年份
}

// 日期范围
export interface DateRange {
  startDate: string;
  endDate: string;
}