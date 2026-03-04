// 厂商分类配置
export interface ManufacturerCategories {
  traditional: string[];  // 传统厂商列表
  newEnergy: string[];    // 新势力厂商列表
  mainstream: string[];   // 主流厂商列表
}

// 厂商分类配置数据
export const manufacturerCategories: ManufacturerCategories = {
  traditional: ['上汽', '一汽', '广汽', '北汽', '东风', '长安', '吉利', '奇瑞', '长城', '比亚迪', '华晨'],
  newEnergy: ['特斯拉', '鸿蒙智行', '小米', '理想', '小鹏', '蔚来', '零跑'],
  // 主流厂商列表
  mainstream: ['上汽', '一汽', '广汽', '北汽', '东风', '长安', '吉利', '奇瑞', '长城', '比亚迪', '华晨', '特斯拉', '鸿蒙智行', '小米', '理想', '小鹏', '蔚来', '零跑']
};

// 判断厂商是否为主流厂商
export const isMainstreamManufacturer = (manufacturer: string): boolean => {
  return manufacturerCategories.mainstream.includes(manufacturer);
};

// 可以根据需要扩展更多分类方法
export const getManufacturerCategory = (manufacturer: string): string => {
  if (manufacturerCategories.traditional.includes(manufacturer)) {
    return 'traditional';
  } else if (manufacturerCategories.newEnergy.includes(manufacturer)) {
    return 'newEnergy';
  }
  return 'other';
};

// 获取分类的显示名称
export const getCategoryDisplayName = (category: string): string => {
  switch (category) {
    case 'traditional':
      return '传统厂商';
    case 'newEnergy':
      return '新势力厂商';
    default:
      return '其他厂商';
  }
};

// 获取厂商的显示名称（对于非主流厂商，返回"其他厂商"）
export const getManufacturerDisplayName = (manufacturer: string): string => {
  return isMainstreamManufacturer(manufacturer) ? manufacturer : '其他厂商';
};

// 合并非主流厂商数据
export const mergeNonMainstreamManufacturers = (data: any[], dataKey: string = 'company', valueKey: string = 'sales'): any[] => {
  const mainstreamData: any[] = [];
  let otherManufacturerSales = 0;
  
  // 分离主流厂商和非主流厂商数据
  data.forEach(item => {
    if (isMainstreamManufacturer(item[dataKey])) {
      mainstreamData.push(item);
    } else {
      otherManufacturerSales += item[valueKey];
    }
  });
  
  // 如果有非主流厂商数据，添加"其他厂商"项
  if (otherManufacturerSales > 0) {
    mainstreamData.push({
      [dataKey]: '其他厂商',
      [valueKey]: otherManufacturerSales,
      color: '#8884d8' // 为"其他厂商"设置默认颜色
    });
  }
  
  return mainstreamData;
};

// 按月合并非主流厂商数据
export const mergeNonMainstreamByMonth = (data: any[], dataKey: string = 'company', valueKey: string = 'sales'): any[] => {
  // 按月份分组
  const monthMap = new Map<string, Record<string, number>>();
  
  data.forEach(item => {
    const monthYearKey = `${item.year}-${item.month}`;
    if (!monthMap.has(monthYearKey)) {
      monthMap.set(monthYearKey, {
        month: item.month,
        year: item.year
      });
    }
    
    const monthData = monthMap.get(monthYearKey)!;
    
    // 对于主流厂商，直接使用厂商名称
    // 对于非主流厂商，统一合并到"其他厂商"
    const displayName = getManufacturerDisplayName(item[dataKey]);
    
    if (!monthData[displayName]) {
      monthData[displayName] = 0;
    }
    
    monthData[displayName] += item[valueKey];
  });
  
  // 转换为数组并按年月排序
  return Array.from(monthMap.values()).sort((a, b) => {
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    return a.month.localeCompare(b.month);
  });
};