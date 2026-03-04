import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line } from 'recharts';
import { DateRange, CarModelData } from '../types';
import { getCurrentCarModelData } from '../mocks/data';
import DateFilter from './DateFilter';

// 车型数据接口
interface CarModel {
  name: string;
  sales: number;
  brand: string;
  manufacturer: string;
  color: string;
  energyType: string;
  price: string;
  brandModelName: string; // 品牌+车型名称
}

// 下拉筛选选项
interface FilterOption {
  id: string;
  name: string;
}

// 完整的车型标识符，包含厂商、品牌和车型名称
interface ModelIdentifier {
  manufacturer: string;
  brand: string;
  modelName: string;
}

// 定义数据显示类型
type DataType = 'sales' | 'mom' | 'yoy';

// 表格行数据类型
interface TableRowData {
  modelId: string;
  modelName: string;
  totalSales: number;
  [monthName: string]: number | string;
  [monthNameWithType: string]: number | string; // 用于存储带类型的数据，如 "2025.01-mom"
}

// 将完整标识符转换为字符串
const getModelIdentifierString = (model: ModelIdentifier): string => {
  return `${model.manufacturer}-${model.brand}-${model.modelName}`;
};

// 从字符串解析回完整标识符
const parseModelIdentifierString = (id: string): ModelIdentifier => {
  const [manufacturer, brand, ...modelNameParts] = id.split('-');
  return {
    manufacturer,
    brand,
    modelName: modelNameParts.join('-')
  };
};

const ModelComparisonChart: React.FC<{ className?: string; dateRange?: DateRange }> = ({ 
  className = '', 
  dateRange: initialDateRange 
}) => {
  // 在组件内部保存日期范围状态，而不是直接使用外部传入的属性
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange || {
    startDate: '2025-01-01',
    endDate: '2025-12-31'
  });
  const [filteredData, setFilteredData] = useState<CarModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // 使用完整标识符存储已选中的车型
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [availableManufacturers, setAvailableManufacturers] = useState<FilterOption[]>([]);
  const [availableBrands, setAvailableBrands] = useState<FilterOption[]>([]);
  const [availableModels, setAvailableModels] = useState<FilterOption[]>([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [manufacturerSearchTerm, setManufacturerSearchTerm] = useState<string>('');
  const [brandSearchTerm, setBrandSearchTerm] = useState<string>('');
  const [modelSearchTerm, setModelSearchTerm] = useState<string>('');
  const [showManufacturerDropdown, setShowManufacturerDropdown] = useState<boolean>(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState<boolean>(false);
  const [showModelDropdown, setShowModelDropdown] = useState<boolean>(false);
  // 表格数据相关状态
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  // 数据显示类型选择
  const [selectedDataTypes, setSelectedDataTypes] = useState<DataType[]>(['sales', 'mom', 'yoy']);
  // 存储车型的原始顺序
  const [modelOrder, setModelOrder] = useState<string[]>([]);
  // 追踪当前悬停的车型
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  
  // 加载数据的函数
  const loadData = () => {
    setIsLoading(true);
    try {
      // 使用内部状态的日期范围来获取数据
      const carModelData = getCurrentCarModelData(dateRange);
      
      // 按车型名称聚合销量数据
      const modelSalesMap = new Map<string, CarModelData>();
      
      carModelData.forEach(item => {
        const key = `${item.manufacturer}-${item.brand}-${item.modelName}`;
        if (modelSalesMap.has(key)) {
          const existingModel = modelSalesMap.get(key)!;
          existingModel.sales += item.sales;
        } else {
          modelSalesMap.set(key, { ...item });
        }
      });
      
      // 转换为数组
      const allModels = Array.from(modelSalesMap.values());
      
      // 获取所有厂商
      const manufacturers = Array.from(new Set(allModels.map(model => model.manufacturer)))
        .map(name => ({ id: name, name }));
      
      setAvailableManufacturers(manufacturers);
      
      // 初始化图表数据
      setFilteredData([]);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 当内部日期范围状态变化时重新加载数据
  useEffect(() => {
    loadData();
  }, [dateRange]);
  
  // 当厂商变化时，更新品牌列表，但保留已选中的车型
  useEffect(() => {
    if (!selectedManufacturer) {
      setAvailableBrands([]);
      setSelectedBrand('');
      setAvailableModels([]);
      return;
    }
    
    const carModelData = getCurrentCarModelData(dateRange);
    const filteredByManufacturer = carModelData.filter(model => model.manufacturer === selectedManufacturer);
    
    const brands = Array.from(new Set(filteredByManufacturer.map(model => model.brand)))
      .map(name => ({ id: name, name }));
    
    setAvailableBrands(brands);
    setSelectedBrand('');
    setBrandSearchTerm(''); // 清空品牌搜索框
    setShowBrandDropdown(false); // 关闭品牌下拉菜单
    setAvailableModels([]);
    setModelSearchTerm(''); // 清空车型搜索框
    setShowModelDropdown(false); // 关闭车型下拉菜单
  }, [selectedManufacturer, dateRange]);
  
  // 当品牌变化时，更新车型列表，但保留已选中的车型
  useEffect(() => {
    if (!selectedManufacturer || !selectedBrand) {
      setAvailableModels([]);
      return;
    }
    
    const carModelData = getCurrentCarModelData(dateRange);
    const filteredByManufacturerAndBrand = carModelData.filter(
      model => model.manufacturer === selectedManufacturer && model.brand === selectedBrand
    );
    
    const models = Array.from(new Set(filteredByManufacturerAndBrand.map(model => model.modelName)))
      .map(name => ({ id: name, name }));
    
    setAvailableModels(models);
    setModelSearchTerm(''); // 清空车型搜索框
    setShowModelDropdown(false); // 关闭车型下拉菜单
  }, [selectedBrand, selectedManufacturer, dateRange]);
  
  // 当选择车型变化时，更新图表数据和表格数据
  useEffect(() => {
    if (selectedModels.length === 0) {
      setFilteredData([]);
      setTableData([]);
      return;
    }
    
    const carModelData = getCurrentCarModelData(dateRange);
    
    // 创建一个映射，存储每个车型的销量数据
    const monthlyDataByModel = new Map<string, Record<string, number>>();
    // 创建一个映射，存储每个车型的环比增长数据
    const monthlyMomByModel = new Map<string, Record<string, number>>();
    
    // 为每个车型和月份组合创建数据
    carModelData.forEach(item => {
      // 创建当前车型的完整标识符
      const currentModelId = getModelIdentifierString({
        manufacturer: item.manufacturer,
        brand: item.brand,
        modelName: item.modelName
      });
      
      // 检查当前车型是否被选中
      if (selectedModels.includes(currentModelId)) {
        const month = `${item.year}.${String(parseInt(item.month)).padStart(2, '0')}`;
        
        if (!monthlyDataByModel.has(month)) {
          monthlyDataByModel.set(month, { month });
        }
        
        if (!monthlyMomByModel.has(month)) {
          monthlyMomByModel.set(month, { month });
        }
        
        const monthData = monthlyDataByModel.get(month)!;
        const momData = monthlyMomByModel.get(month)!;
        
        if (!monthData[currentModelId]) {
          monthData[currentModelId] = 0;
        }
        if (!momData[currentModelId]) {
          momData[currentModelId] = 0;
        }
        monthData[currentModelId] += item.sales;
        // 初始化环比数据为0，后续计算
        momData[currentModelId] = 0;
      }
    });
    
    // 转换为数组并排序
    const formattedData = Array.from(monthlyDataByModel.values()).sort((a, b) => a.month.localeCompare(b.month));
    
    // 确保每个车型在每个月都有数据点（包括0）
    selectedModels.forEach(modelId => {
      formattedData.forEach(monthData => {
        if (monthData[modelId] === undefined) {
          monthData[modelId] = 0;
        }
      });
    });
    
    // 计算环比增长数据
    selectedModels.forEach(modelId => {
      for (let i = 1; i < formattedData.length; i++) {
        const currentMonthData = formattedData[i];
        const prevMonthData = formattedData[i - 1];
        
        if (prevMonthData[modelId] > 0) {
          const mom = ((currentMonthData[modelId] - prevMonthData[modelId]) / prevMonthData[modelId]) * 100;
          formattedData[i][`${modelId}-mom`] = mom;
        } else {
          formattedData[i][`${modelId}-mom`] = 0;
        }
      }
    });
    
    setFilteredData(formattedData);
    
    // 创建一个映射，存储每个车型的销量数据
    const monthlyDataByModelForTable = new Map<string, Record<string, number>>();
    
    // 为每个车型和月份组合创建数据
    carModelData.forEach(item => {
      // 创建当前车型的完整标识符
      const currentModelId = getModelIdentifierString({
        manufacturer: item.manufacturer,
        brand: item.brand,
        modelName: item.modelName
      });
      
      // 检查当前车型是否被选中
      if (selectedModels.includes(currentModelId)) {
        const month = `${item.year}.${String(parseInt(item.month)).padStart(2, '0')}`;
        
        if (!monthlyDataByModelForTable.has(month)) {
          monthlyDataByModelForTable.set(month, { month });
        }
        
        const monthData = monthlyDataByModelForTable.get(month)!;
        if (!monthData[currentModelId]) {
          monthData[currentModelId] = 0;
        }
        monthData[currentModelId] += item.sales;
      }
    });
    
    // 转换为数组并排序
    const formattedDataForTable = Array.from(monthlyDataByModelForTable.values()).sort((a, b) => a.month.localeCompare(b.month));
    
    // 确保每个车型在每个月都有数据点（包括0）
    selectedModels.forEach(modelId => {
      formattedDataForTable.forEach(monthData => {
        if (monthData[modelId] === undefined) {
          monthData[modelId] = 0;
        }
      });
    });
    
    setFilteredData(formattedDataForTable);
    
    // 生成表格数据
    generateTableData(carModelData, formattedDataForTable);
  }, [selectedModels, dateRange]);
  
  // 当表格数据第一次加载时，保存车型的原始顺序
  useEffect(() => {
    if (tableData.length > 0 && modelOrder.length === 0) {
      const uniqueModels = Array.from(new Set(tableData.map(row => row.modelId)));
      setModelOrder(uniqueModels);
    }
  }, [tableData]);
  
  // 当排序配置变化时，重新排序表格数据
  useEffect(() => {
    if (sortConfig) {
      const sortedData = [...tableData].sort((a, b) => {
        // 优先按车型的原始顺序排序
        if (modelOrder.length > 0 && a.modelId !== b.modelId) {
          const indexA = modelOrder.findIndex(modelId => modelId === a.modelId);
          const indexB = modelOrder.findIndex(modelId => modelId === b.modelId);
          // 如果两个车型都在原始顺序中，按照原始顺序排序
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          // 如果只有一个车型在原始顺序中，它应该排在前面
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          // 如果两个车型都不在原始顺序中，按照名称排序
          return sortConfig.direction === 'asc' 
            ? (a.modelName as string).localeCompare(b.modelName as string) 
            : (b.modelName as string).localeCompare(a.modelName as string);
        }
        
        // 按指定的排序键排序
        const valueA = a[sortConfig.key];
        const valueB = b[sortConfig.key];
        
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          if (valueA < valueB) {
            return sortConfig.direction === 'asc' ? -1 : 1;
          }
          if (valueA > valueB) {
            return sortConfig.direction === 'asc' ? 1 : -1;
          }
        }
        
        return 0;
      });
      
      setTableData(sortedData);
    }
  }, [sortConfig, tableData, modelOrder]);
  
  // 生成表格数据
  const generateTableData = (carModelData: CarModelData[], chartData: any[]) => {
    // 获取所有月份
    const months = Array.from(new Set(chartData.map(item => item.month))).sort();
    
    // 创建表格数据
    const newTableData: TableRowData[] = [];
    
    selectedModels.forEach(modelId => {
      // 解析车型标识符
      const { manufacturer, brand, modelName } = parseModelIdentifierString(modelId);
      
      const row: TableRowData = {
        modelId,
        modelName: `${manufacturer}-${brand}-${modelName}`,
        totalSales: 0
      };
      
      // 为每个月添加销量、环比、同比数据
      months.forEach((month, index) => {
        // 从图表数据中获取销量
        const monthData = chartData.find(item => item.month === month);
        const monthSales = monthData ? (monthData[modelId] as number) : 0;
        
        // 销量数据
        row[month] = monthSales;
        
        // 计算环比 (2025年1月不需要环比)
        if (index > 0) {
          const prevMonth = months[index - 1];
          const prevMonthData = chartData.find(item => item.month === prevMonth);
          const prevMonthSales = prevMonthData ? (prevMonthData[modelId] as number) : 0;
          
          if (prevMonthSales > 0) {
            row[`${month}-mom`] = ((monthSales - prevMonthSales) / prevMonthSales * 100).toFixed(2);
          } else {
            row[`${month}-mom`] = '-';
          }
        } else {
          row[`${month}-mom`] = '-';
        }
        
        // 计算同比 (从数据中查找去年同月数据)
        const year = parseInt(month.split('.')[0]);
        const monthNum = parseInt(month.split('.')[1]);
        
        // 查找去年同月数据
        const lastYearData = carModelData.filter(
          item => item.manufacturer === manufacturer && 
                 item.brand === brand &&
                 item.modelName === modelName &&
                 item.year === year - 1 &&
                 parseInt(item.month) === monthNum
        );
        
        if (lastYearData.length > 0) {
          const lastYearSales = lastYearData.reduce((sum, item) => sum + item.sales, 0);
          if (lastYearSales > 0) {
            row[`${month}-yoy`] = ((monthSales - lastYearSales) / lastYearSales * 100).toFixed(2);
          } else {
            row[`${month}-yoy`] = '-';
          }
        } else {
          row[`${month}-yoy`] = '-';
        }
        
        // 累加到总销量
        row.totalSales = (row.totalSales as number) + monthSales;
      });
      
      newTableData.push(row);
    });
    
    setTableData(newTableData);
  };
  
  // 处理车型选择变化
  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        // 创建完整的车型标识符
        const fullModelId = selectedManufacturer && selectedBrand 
          ? getModelIdentifierString({
              manufacturer: selectedManufacturer,
              brand: selectedBrand,
              modelName: modelId
            })
          : modelId;
        
        return [...prev, fullModelId];
      }
    });
  };
  
  // 处理数据类型选择变化
  const handleDataTypeChange = (type: DataType) => {
    setSelectedDataTypes(prev => {
      if (prev.includes(type)) {
        // 确保至少保留一个选中项
        if (prev.length > 1) {
          return prev.filter(t => t !== type);
        }
        return prev;
      } else {
        return [...prev, type];
      }
    });
  };
  
  // 处理表格排序
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      // 分离销量数据和环比增长数据
      const salesEntries = payload.filter((entry: any) => !entry.dataKey.includes('-mom'));
      const momEntries = payload.filter((entry: any) => entry.dataKey.includes('-mom'));
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{payload[0].payload.month}</p>
          
          {salesEntries.map((entry: any, index: number) => {
            // 检查当前条目是否是悬停的车型
            const isHovered = hoveredModel && entry.name === getModelDisplayName(hoveredModel);
            
            return (
              <p key={`sales-${index}`} className={`flex items-center mt-1 ${isHovered ? 'font-bold' : ''}`}>
                <span 
                  className="w-3 h-3 inline-block mr-2" 
                  style={{ backgroundColor: entry.color }}
                ></span>
                <span className={`text-sm ${isHovered ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
                  {entry.name}:
                </span>
                <span className={`ml-2 text-sm ${isHovered ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium text-gray-900 dark:text-white'}`}>
                  {formatNumber(entry.value)} 辆
                </span>
              </p>
            );
          })}
          
          {momEntries.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {momEntries.map((entry: any, index: number) => {
                // 检查当前条目是否是悬停的车型
                const isHovered = hoveredModel && entry.name.split(' 环比增长')[0] === getModelDisplayName(hoveredModel);
                const isPositive = entry.value > 0;
                
                return (
                  <p 
                    key={`mom-${index}`} 
                    className={`flex items-center mt-1 ${isHovered ? 'font-bold' : ''}`}
                  >
                    <span 
                      className="w-3 h-3 inline-block mr-2" 
                      style={{ backgroundColor: entry.color }}
                    ></span>
                    <span className={`text-sm ${isHovered ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
                      {entry.name}:
                    </span>
                    <span className={`ml-2 text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isPositive ? '+' : ''}{entry.value.toFixed(1)}%
                    </span>
                  </p>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    return null;
  };
  
  // 生成随机颜色
  const generateColor = (index: number): string => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#84cc16'];
    return colors[index % colors.length];
  };
  
  // 过滤选项
  const getFilteredManufacturers = () => {
    if (!manufacturerSearchTerm) return availableManufacturers;
    return availableManufacturers.filter(item => 
      item.name.toLowerCase().includes(manufacturerSearchTerm.toLowerCase())
    );
  };
  
  const getFilteredBrands = () => {
    if (!brandSearchTerm) return availableBrands;
    return availableBrands.filter(item => 
      item.name.toLowerCase().includes(brandSearchTerm.toLowerCase())
    );
  };
  
  const getFilteredModels = () => {
    if (!modelSearchTerm) return availableModels;
    return availableModels.filter(item => 
      item.name.toLowerCase().includes(modelSearchTerm.toLowerCase())
    );
  };
  
  // 获取车型显示名称
  const getModelDisplayName = (modelId: string): string => {
    try {
      // 尝试解析完整标识符
      const { manufacturer, brand, modelName } = parseModelIdentifierString(modelId);
      return `${manufacturer}-${brand}-${modelName}`;
    } catch {
      // 如果解析失败，返回原始ID
      return modelId;
    }
  };
  
  // 根据百分比值获取颜色类
  const getPercentageColorClass = (value: number | string): string => {
    if (value === '-') return 'text-gray-500';
    
    const numValue = typeof value === 'number' ? value : parseFloat(value as string);
    
    if (numValue > 0) {
      // 正值：红色系，值越大颜色越深
      if (numValue > 20) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      if (numValue > 10) return 'bg-red-50 text-red-700 dark:bg-red-800/20 dark:text-red-200';
      if (numValue > 5) return 'bg-orange-50 text-orange-600 dark:bg-orange-800/20 dark:text-orange-200';
      return 'bg-yellow-50 text-yellow-600 dark:bg-yellow-800/20 dark:text-yellow-200';
    } else if (numValue < 0) {
      // 负值：绿色系，值越小颜色越深
      const absValue = Math.abs(numValue);
      if (absValue > 20) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      if (absValue > 10) return 'bg-green-50 text-green-700 dark:bg-green-800/20 dark:text-green-200';
      if (absValue > 5) return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-800/20 dark:text-emerald-200';
      return 'bg-teal-50 text-teal-600 dark:bg-teal-800/20 dark:text-teal-200';
    } else {
      // 零值：中性色
      return 'bg-gray-50 text-gray-600 dark:bg-gray-700/30 dark:text-gray-300';
    }
  };
  
  // 格式化百分比
  const formatPercentage = (value: number | string): string => {
    if (value === '-') return '-';
    
    const numValue = typeof value === 'number' ? value : parseFloat(value as string);
    return `${numValue > 0 ? '+' : ''}${numValue.toFixed(1)}%`;
  };

  return (
    <motion.div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">车型销量对比分析</h3>
      
      {/* 筛选区域 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 厂商筛选 */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            厂商
          </label>
          <div className="relative">
            <input
              type="text"
              value={manufacturerSearchTerm}
              onChange={(e) => setManufacturerSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              placeholder="输入厂商名称搜索"
            />
            <button
              onClick={() => setShowManufacturerDropdown(!showManufacturerDropdown)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <i className={`fa-solid ${showManufacturerDropdown ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
            </button>
            {showManufacturerDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                {getFilteredManufacturers().map(manufacturer => (
                  <div
                    key={manufacturer.id}
                    className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                      selectedManufacturer === manufacturer.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                    }`}
                    onClick={() => {
                      setSelectedManufacturer(manufacturer.id);
                      setManufacturerSearchTerm(manufacturer.name);
                      setShowManufacturerDropdown(false);
                    }}
                  >
                    {manufacturer.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* 品牌筛选 */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            品牌
          </label>
          <div className="relative">
            <input
              type="text"
              value={brandSearchTerm}
              onChange={(e) => setBrandSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              placeholder="输入品牌名称搜索"
              disabled={!selectedManufacturer}
            />
            <button
              onClick={() => setShowBrandDropdown(!showBrandDropdown)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              disabled={!selectedManufacturer}
            >
              <i className={`fa-solid ${showBrandDropdown ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
            </button>
            {showBrandDropdown && selectedManufacturer && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                {getFilteredBrands().map(brand => (
                  <div
                    key={brand.id}
                    className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                      selectedBrand === brand.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                    }`}
                    onClick={() => {
                      setSelectedBrand(brand.id);
                      setBrandSearchTerm(brand.name);
                      setShowBrandDropdown(false);
                    }}
                  >
                    {brand.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* 车型筛选 */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            车型
          </label>
          <div className="relative">
            <input
              type="text"
              value={modelSearchTerm}
              onChange={(e) => setModelSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              placeholder="输入车型名称搜索"
              disabled={!selectedBrand}
            />
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              disabled={!selectedBrand}
            >
              <i className={`fa-solid ${showModelDropdown ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
            </button>
            {showModelDropdown && selectedBrand && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                {getFilteredModels().map(model => (
                  <div
                    key={model.id}
                    className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center ${
                      // 检查是否已选中此车型（基于完整标识符）
                      selectedModels.some(selectedModelId => {
                        try {
                          const { modelName } = parseModelIdentifierString(selectedModelId);
                          return modelName === model.id;
                        } catch {
                          return false;
                        }
                      }) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                    }`}
                    onClick={() => {
                      handleModelToggle(model.id);
                    }}
                  >
                    {model.name}
                    {selectedModels.some(selectedModelId => {
                      try {
                        const { modelName } = parseModelIdentifierString(selectedModelId);
                        return modelName === model.id;
                      } catch {
                        return false;
                      }
                    }) && (
                      <i className="fa-solid fa-check"></i>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 已选车型标签 */}
      {selectedModels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {selectedModels.map(modelId => {
            return (
              <span
                key={modelId}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {getModelDisplayName(modelId)}
                <button
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  onClick={() => setSelectedModels(prev => prev.filter(id => id !== modelId))}
                >
                  <i className="fa-solid fa-times-circle"></i>
                </button>
              </span>
            );
          })}
        </div>
      )}
      
        {/* 日期范围选择 */}
         <div className="mb-6">
           <DateFilter 
             onDateRangeChange={(newDateRange) => {
               // 日期范围变化时更新内部状态
               console.log('Date range changed:', newDateRange);
               setDateRange(newDateRange);
               // 重新加载数据
               loadData();
             }}
             defaultStartDate={dateRange.startDate}
             defaultEndDate={dateRange.endDate}
           />
         </div>
      
      {/* 图表部分 */}
      <div className="h-[400px] overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
        <div className="min-w-[800px] h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 dark:text-gray-400 flex items-center">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                <span>加载数据中...</span>
              </div>
            </div>
          ) : filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#6b7280' }} 
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                  <YAxis 
                    tick={{ fill: '#6b7280' }} 
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                  />
      <Tooltip 
        content={<CustomTooltip />} 
        contentStyle={{ pointerEvents: 'none' }}
         offset={100} // 调整偏移量值为100
      />
                <Legend 
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={(value) => {
                    const displayName = getModelDisplayName(value);
                    return (
                      <span className={`text-sm ${hoveredModel && getModelDisplayName(hoveredModel) === displayName ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {displayName}
                      </span>
                    );
                  }}
                />
                  {selectedModels.map((modelId, index) => {
                    const isHovered = hoveredModel === modelId;
                    const displayName = getModelDisplayName(modelId);
                    const lineColor = generateColor(index);
                    
                    return (
                      <>
                        <Bar 
                          key={`bar-${modelId}`}
                          dataKey={modelId} 
                          name={displayName}
                          fill={lineColor}
                          radius={[4, 4, 0, 0]}
                          animationDuration={1500}
                          // 添加鼠标事件处理器
                          onMouseEnter={() => setHoveredModel(modelId)}
                          onMouseLeave={() => setHoveredModel(null)}
                          style={{ 
                            opacity: hoveredModel ? (isHovered ? 1 : 0.6) : 1,
                            stroke: isHovered ? lineColor : 'none',
                            strokeWidth: isHovered ? 2 : 0,
                            transition: 'all 0.2s ease-in-out',
                            cursor: 'pointer'
                          }}
                        />
                        <Line
                          key={`line-${modelId}`}
                          type="monotone"
                          dataKey={`${modelId}-mom`}
                          name={`${displayName} 环比增长`}
                          stroke={lineColor}
                          strokeWidth={2}
                          dot={{
                            fill: lineColor,
                            r: 4,
                            stroke: '#fff',
                            strokeWidth: 2
                          }}
                          activeDot={{ r: 6 }}
                          yAxisId="right"
                          animationDuration={1500}
                          onMouseEnter={() => setHoveredModel(modelId)}
                          onMouseLeave={() => setHoveredModel(null)}
                          style={{
                            opacity: hoveredModel ? (isHovered ? 1 : 0.6) : 1,
                            transition: 'all 0.2s ease-in-out',
                            cursor: 'pointer'
                          }}
                        />
                      </>
                    );
                  })}
              </BarChart>
            </ResponsiveContainer>
          ) : selectedModels.length > 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">请选择要对比的车型</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 滚动提示 */}
      {filteredData.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
          <span>左右滑动可查看更多数据</span>
          <div className="flex items-center">
            <i className="fa-solid fa-hand-point-left mr-1"></i>
            <i className="fa-solid fa-hand-point-right"></i>
          </div>
        </div>
      )}
      
      {/* 车型销量明细表 */}
      {selectedModels.length > 0 && (
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">车型销量明细</h4>
            <div className="bg-gray-50 dark:bg-gray-750 p-2 rounded-lg mt-4 md:mt-0">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">显示数据：</label>
              <div className="flex space-x-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDataTypes.includes('sales')}
                    onChange={() => handleDataTypeChange('sales')}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    disabled={selectedDataTypes.length <= 1 && selectedDataTypes.includes('sales')}
                  />
                  <span className="ml-1 text-xs text-gray-700 dark:text-gray-300">销量</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDataTypes.includes('mom')}
                    onChange={() => handleDataTypeChange('mom')}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    disabled={selectedDataTypes.length <= 1 && selectedDataTypes.includes('mom')}
                  />
                  <span className="ml-1 text-xs text-gray-700 dark:text-gray-300">环比</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDataTypes.includes('yoy')}
                    onChange={() => handleDataTypeChange('yoy')}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    disabled={selectedDataTypes.length <= 1 && selectedDataTypes.includes('yoy')}
                  />
                  <span className="ml-1 text-xs text-gray-700 dark:text-gray-300">同比</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-[900px] border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              {/* 表格头部 - 分层表头 */}
              <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
                {/* 第一层表头 - 月份 */}
                <tr>
                  <th rowSpan={2} 
                    className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => handleSort('modelName')}
                    style={{ minWidth: '150px' }}
                  >
                    <div className="flex items-center">
                      <span className="text-xs">品牌+车型</span>
                      {sortConfig?.key === 'modelName' && (
                        <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                      )}
                   </div>
                </th>
              
                {/* 月份表头 - 合并单元格 */}
                {filteredData.length > 0 && filteredData.map((item) => (
                  <th 
                    key={`month-${item.month}`} 
                    colSpan={selectedDataTypes.length} 
                    className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    <div className="flex items-center justify-center">
                      <span className="text-sm">{item.month}</span>
                    </div>
                  </th>
                ))}
                
                <th rowSpan={2} 
                  className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => handleSort('totalSales')}
                >
                  <div className="flex items-center justify-center">
                    <span className="text-xs">总计</span>
                    {sortConfig?.key === 'totalSales' && (
                      <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                    )}
                 </div>
               </th>
            </tr>
            
            {/* 第二层表头 - 根据选择显示销量、环比、同比 */}
            <tr className="bg-gray-100 dark:bg-gray-800">
              {filteredData.length > 0 && filteredData.map((item) => (
                <>
                  {selectedDataTypes.includes('sales') && (
                    <th 
                      key={`${item.month}-sales`} 
                      className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => handleSort(item.month)}
                      style={{ minWidth: '40px' }}
                    >
                      <div className="flex items-center justify-center">
                        <span className="text-xs">销量</span>
                        {sortConfig?.key === item.month && (
                          <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                        )}
                      </div>
                    </th>
                  )}
                  
                  {selectedDataTypes.includes('mom') && (
                    <th 
                      key={`${item.month}-mom`} 
                      className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => handleSort(`${item.month}-mom`)}
                      style={{ minWidth: '40px' }}
                    >
                      <div className="flex items-center justify-center">
                        <span className="text-xs">环比</span>
                        {sortConfig?.key === `${item.month}-mom` && (
                          <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                        )}
                      </div>
                    </th>
                  )}
                  
                  {selectedDataTypes.includes('yoy') && (
                    <th 
                      key={`${item.month}-yoy`} 
                      className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => handleSort(`${item.month}-yoy`)}
                      style={{ minWidth: '40px' }}
                    >
                      <div className="flex items-center justify-center">
                        <span className="text-xs">同比</span>
                        {sortConfig?.key === `${item.month}-yoy` && (
                          <i className={`fa-solid ml-1 ${sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
                        )}
                      </div>
                    </th>
                  )}
                </>
              ))}
            </tr>
            </thead>
            
            {/* 表格主体 */}
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {tableData.length > 0 ? (
                tableData.map((row, index) => {
                  return (
                    <tr 
                      key={`${row.modelId}-${index}`} 
                      className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}
                    >
                       {/* 车型名称单元格 */}
                       <td className="px-2 py-1.5 whitespace-nowrap" style={{ verticalAlign: 'middle' }}>
                         <div className="flex items-center">
                           <div 
                             className="h-5 w-5 rounded-full flex items-center justify-center mr-2" 
                             style={{ backgroundColor: generateColor(index % 8) }}
                           >
                            <span className="text-white text-xs font-medium">{row.modelName[0]}</span>
                         </div>
                         <span className="text-sm font-medium text-gray-900 dark:text-white">{row.modelName}</span>
                       </div>
                     </td>
                   
                     {/* 月份数据单元格 */}
                     {filteredData.length > 0 && filteredData.map((item) => (
                       <>
                         {selectedDataTypes.includes('sales') && (
                           <td 
                             key={`${item.month}-sales`} 
                             className="px-1 py-1.5 text-center"
                             style={{ verticalAlign: 'middle' }}
                           >
                             <p className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(row[item.month] as number)}</p>
                           </td>
                         )}
                         
                         {selectedDataTypes.includes('mom') && (
                           <td 
                             key={`${item.month}-mom`} 
                             className={`px-1 py-1.5 text-center ${getPercentageColorClass(row[`${item.month}-mom`])}`}
                             style={{ verticalAlign: 'middle' }}
                           >
                             <p className="text-sm font-medium">{formatPercentage(row[`${item.month}-mom`])}</p>
                           </td>
                         )}
                         
                         {selectedDataTypes.includes('yoy') && (
                           <td 
                             key={`${item.month}-yoy`}className={`px-1 py-1.5 text-center ${getPercentageColorClass(row[`${item.month}-yoy`])}`}
                             style={{ verticalAlign: 'middle' }}
                           >
                             <p className="text-sm font-medium">{formatPercentage(row[`${item.month}-yoy`])}</p>
                           </td>
                         )}
                       </>
                     ))}
                   
                     {/* 总计单元格 */}
                     <td 
                       className="px-1 py-1.5 text-center"
                       style={{ verticalAlign: 'middle' }}
                     >
                       <p className="text-sm font-bold text-gray-900 dark:text-white">{formatNumber(row.totalSales as number)}</p>
                     </td>
                   </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={filteredData.length * selectedDataTypes.length + 2} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* 表格说明 */}
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          注：表格展示各车型在选定时间范围内的详细销量数据，包括月度销量、环比和同比增长情况。点击表头可进行排序。
        </p>
      </motion.div>
      )}
    </motion.div>
  );
};

export default ModelComparisonChart;