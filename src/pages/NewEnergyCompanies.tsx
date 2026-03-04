import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import { DateRange } from '../types';
import DateFilter from '../components/DateFilter';
import { useLocation } from 'react-router-dom';
import ViewSelector from '../components/ViewSelector';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getCurrentCarModelData, carCompanies, formatMonthWithYear, getLatestModelPrice } from '../mocks/data';
import { manufacturerCategories } from '../mocks/manufacturerCategories';
import { energyTypes } from '../mocks/energyTypes';
import NewEnergyBrandModelsTable from '../components/NewEnergyBrandModelsTable';

// 定义价格区间
const PRICE_RANGES = [
  { name: '10万以下', min: 0, max: 10, color: '#3b82f6' },
  { name: '10~15万', min: 10, max: 15, color: '#10b981' },
  { name: '15~25万', min: 15, max: 25, color: '#f59e0b' },
  { name: '25~35万', min: 25, max: 35, color: '#8b5cf6' },
  { name: '35~50万', min: 35, max: 50, color: '#ec4899' },
  { name: '50万以上', min: 50, max: Infinity, color: '#ef4444' }
];

export default function NewEnergyCompanies() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  
  // 从路由状态中获取日期范围，如果没有则使用默认值
  const initialDateRange = location.state?.dateRange || {
    startDate: '2025-01-01',
    endDate: '2025-12-31'
  };
  
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [sortedData, setSortedData] = useState<any[]>([]);
  const [monthlySalesData, setMonthlySalesData] = useState<any[]>([]);
  const [priceRangeData, setPriceRangeData] = useState<any[]>([]);
  const [energyTypeData, setEnergyTypeData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // 新增: 月度销量趋势数据
  const [monthlyTrendData, setMonthlyTrendData] = useState<any[]>([]);
  // 追踪当前悬停的车企
  const [hoveredCompany, setHoveredCompany] = useState<string | null>(null);
  
  // 新增: 动力类型和价格区间筛选状态
  const [selectedEnergyTypes, setSelectedEnergyTypes] = useState<string[]>(energyTypes.map(type => type.name));
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>(PRICE_RANGES.map(range => range.name));
  const [showEnergyDropdown, setShowEnergyDropdown] = useState<boolean>(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState<boolean>(false);

  // 新势力品牌车型销量模块的状态
  const [selectedBrand, setSelectedBrand] = useState<string>(manufacturerCategories.newEnergy[0]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showBrandDropdown, setShowBrandDropdown] = useState<boolean>(false);
  const [brandModelsData, setBrandModelsData] = useState<any[]>([]);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  // 当日期范围变化时，从CSV数据中重新获取和处理数据
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      try {
        // 从CSV数据中获取车型数据
        const carModelData = getCurrentCarModelData(dateRange);
        
        // 筛选出新势力企业的数据
        const newEnergyCompanies = carCompanies.filter(company => 
          manufacturerCategories.newEnergy.includes(company.name)
        );
        
        // 计算各企业的总销量、市场份额和增长率
        const companyStats: any[] = [];
        const totalSales = carModelData.reduce((sum, item) => sum + item.sales, 0);
        
        newEnergyCompanies.forEach(company => {
          // 计算该企业的总销量
          const companySales = carModelData
            .filter(item => item.manufacturer === company.name)
            .reduce((sum, item) => sum + item.sales, 0);
          
          // 计算市场份额
          const marketShare = totalSales > 0 ? parseFloat(((companySales / totalSales) * 100).toFixed(1)) : 0;
          
          // 这里使用随机增长率作为示例，实际应用中应该根据历史数据计算
          const growthRate = parseFloat((Math.random() * 80 + 10).toFixed(1));
          
          companyStats.push({
            name: company.name,
            sales: companySales,
            marketShare,
            growthRate,
            color: company.color
          });
        });
        
        // 按销量排序
        companyStats.sort((a, b) => b.sales - a.sales);
        setSortedData(companyStats);
        
         // 生成月度销量趋势数据
  generateMonthlyTrendData(carModelData, newEnergyCompanies);
        
         // 生成价格区间分布数据
        generatePriceRangeData(carModelData);
        // 生成能源类型分布数据
        generateEnergyTypeData(carModelData);
        
        // 生成新势力品牌车型销量数据
        generateBrandModelsData(carModelData);
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [dateRange]);

  // 当选择的品牌变化时，重新生成品牌车型销量数据
  useEffect(() => {
    if (!isLoading) {
      const carModelData = getCurrentCarModelData(dateRange);
      generateBrandModelsData(carModelData);
    }
  }, [selectedBrand, dateRange]);

  // 生成月度销量趋势数据（包含销量占比）
  const generateMonthlyTrendData = (carModelData: any[], companies: any[]) => {
    // 按月分组统计销量
    const monthlyMap = new Map<string, Record<string, number>>();
    
    // 按年月组合分组数据
    carModelData.forEach(item => {
      const monthYearKey = formatMonthWithYear(item.month, item.year);
      if (!monthlyMap.has(monthYearKey)) {
        monthlyMap.set(monthYearKey, { month: monthYearKey });
      }
      
      const monthData = monthlyMap.get(monthYearKey)!;
      if (!monthData[item.manufacturer]) {
        monthData[item.manufacturer] = 0;
      }
      monthData[item.manufacturer] += item.sales;
    });
    
    // 转换为数组并按年月排序
    const data = Array.from(monthlyMap.values()).sort((a, b) => {
      return a.month.localeCompare(b.month);
    });
    
    // 确保所有企业的数据都存在
    data.forEach(monthData => {
      companies.forEach(company => {
        if (monthData[company.name] === undefined) {
          monthData[company.name] = 0;
        }
      });
    });
    
    // 计算每个月各厂商的销量占比
    const trendDataWithPercentage = data.map(monthData => {
      const monthTotalSales = companies.reduce((sum: number, company: any) => {
        return sum + (monthData[company.name] || 0);
      }, 0);
      
      const result: any = { ...monthData };
      
      // 为每个厂商添加占比数据
      companies.forEach(company => {
        const sales = monthData[company.name] || 0;
        result[`${company.name}Percentage`] = monthTotalSales > 0 
          ? parseFloat(((sales / monthTotalSales) * 100).toFixed(1)) 
          : 0;
      });
      
      return result;
    });
    
    setMonthlyTrendData(trendDataWithPercentage);
  };

  // 生成品牌车型销量数据
  const generateBrandModelsData = (carModelData: any[]) => {
    // 筛选出选中品牌的数据
    const brandData = carModelData.filter(item => item.manufacturer === selectedBrand);
    
    // 按车型和月份聚合数据
    const modelMonthMap = new Map<string, Map<string, number>>();
    
    brandData.forEach(item => {
      const modelKey = item.modelName;
      const monthKey = `${item.year}-${item.month}`;
      
      if (!modelMonthMap.has(modelKey)) {
        modelMonthMap.set(modelKey, new Map<string, number>());
      }
      
      const monthMap = modelMonthMap.get(modelKey)!;
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, 0);
      }
      
      monthMap.set(monthKey, monthMap.get(monthKey)! + item.sales);
    });
    
    // 获取所有月份并按时间顺序排序
    const allMonthKeys = Array.from(new Set(
      Array.from(modelMonthMap.values())
        .flatMap(monthMap => Array.from(monthMap.keys()))
    )).sort((a, b) => {
      // 解析年月进行比较
      const [yearA, monthA] = a.split('-');
      const [yearB, monthB] = b.split('-');
      
      if (parseInt(yearA) !== parseInt(yearB)) {
        return parseInt(yearA) - parseInt(yearB);
      }
      return parseInt(monthA.replace('月', '')) - parseInt(monthB.replace('月', ''));
    });
    
    // 转换为图表所需的数据格式
    const chartDataFormatted: any[] = [];
    
    allMonthKeys.forEach(monthKey => {
      const [year, month] = monthKey.split('-');
      const formattedMonth = formatMonthWithYear(month, parseInt(year));
      
      const dataPoint: any = { month: formattedMonth };
      
      modelMonthMap.forEach((monthMap, modelName) => {
        dataPoint[modelName] = monthMap.get(monthKey) || 0;
      });
      
      chartDataFormatted.push(dataPoint);
    });
    
    setBrandModelsData(chartDataFormatted);
  };

  // 生成价格区间分布数据
  const generatePriceRangeData = (carModelData: any[]) => {
    // 按价格区间分组统计销量
    const priceRangeSales: Record<string, number> = {};
    
    // 初始化所有价格区间为0
    PRICE_RANGES.forEach(range => {
      priceRangeSales[range.name] = 0;
    });
    
    // 计算每个价格区间的销量
    carModelData.forEach(item => {
       // 使用时间范围内最新的价格来确定价格区间
      const latestPrice = getLatestModelPrice(
        carModelData,
        item.manufacturer,
        item.brand,
        item.modelName,
        dateRange
      );
      const avgPrice = latestPrice 
        ? (latestPrice.minPrice + latestPrice.maxPrice) / 2 
        : (item.minPrice + item.maxPrice) / 2;
      
      // 找到对应的价格区间
      const priceRange = PRICE_RANGES.find(range => 
        avgPrice >= range.min && avgPrice < range.max
      );
      
      if (priceRange) {
        priceRangeSales[priceRange.name] += item.sales;
      }
    });
    
    // 计算总销量
    const totalSales = Object.values(priceRangeSales).reduce((sum, sales) => sum + sales, 0);
    
    // 转换为图表数据格式
    const data = Object.keys(priceRangeSales)
      .filter(range => priceRangeSales[range] > 0)
      .map(range => {
        const rangeConfig = PRICE_RANGES.find(r => r.name === range);
        return {
          name: range,
          销量: priceRangeSales[range],
          占比: totalSales > 0 ? parseFloat(((priceRangeSales[range] / totalSales) * 100).toFixed(1)) : 0,
          color: rangeConfig?.color || '#8884d8'
        };
      });
    
    setPriceRangeData(data);
  }

  // 生成能源类型分布数据
  const generateEnergyTypeData = (carModelData: any[]) => {
    // 按能源类型分组统计销量
    const energyTypeSales: Record<string, number> = {};
    
    // 初始化所有能源类型为0
    energyTypes.forEach(type => {
      energyTypeSales[type.name] = 0;
    });
    
    // 计算每个能源类型的销量
    carModelData.forEach(item => {
      energyTypeSales[item.energyType] = (energyTypeSales[item.energyType] || 0) + item.sales;
    });
    
    // 计算总销量
    const totalSales = Object.values(energyTypeSales).reduce((sum, sales) => sum + sales, 0);
    
    // 转换为图表数据格式
    const data = Object.keys(energyTypeSales)
      .filter(type => type !== '未知' && energyTypeSales[type] > 0)
      .map(type => {
        const energyTypeConfig = energyTypes.find(et => et.name === type);
        return {
          name: type,
          销量: energyTypeSales[type],
          占比: totalSales > 0 ? parseFloat(((energyTypeSales[type] / totalSales) * 100).toFixed(1)) : 0,
          color: energyTypeConfig?.color || '#8884d8'
        };
      });
    
    setEnergyTypeData(data);
  };

  // 处理日期范围变化
  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
    // 数据会在useEffect中自动更新
  };

  // 处理排序
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    const sorted = [...sortedData].sort((a: any, b: any) => {
      if (a[key] < b[key]) {
        return direction === 'asc' ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    setSortedData(sorted);
    setSortConfig({ key, direction });
  };

  // 处理线条的鼠标进入事件
  const handleLineMouseEnter = (companyName: string) => {
    setHoveredCompany(companyName);
  };

  // 处理线条的鼠标离开事件
  const handleLineMouseLeave = () => {
    setHoveredCompany(null);
  };

  // 处理车型线条的鼠标进入事件
  const handleModelMouseEnter = (modelName: string) => {
    setHoveredModel(modelName);
  };

  // 处理车型线条的鼠标离开事件
  const handleModelMouseLeave = () => {
    setHoveredModel(null);
  };

  // 新增: 处理动力类型选择
  const handleEnergyTypeToggle = (energyType: string) => {
    setSelectedEnergyTypes(prev => {
      if (prev.includes(energyType)) {
        // 确保至少保留一个选中项
        if (prev.length > 1) {
          return prev.filter(type => type !== energyType);
        }
        return prev;
      } else {
        return [...prev, energyType];
      }
    });
  };

  // 新增: 处理价格区间选择
  const handlePriceRangeToggle = (priceRange: string) => {
    setSelectedPriceRanges(prev => {
      if (prev.includes(priceRange)) {
        // 确保至少保留一个选中项
        if (prev.length > 1) {
          return prev.filter(range => range !== priceRange);
        }
        return prev;
      } else {
        return [...prev, priceRange];
      }
    });
  };

  // 新增: 获取过滤后的企业数据
  const getFilteredCompanyData = () => {
    // 从CSV数据中获取车型数据
    const carModelData = getCurrentCarModelData(dateRange);
    
    // 筛选出新势力企业的数据
    const newEnergyCompanies = carCompanies.filter(company => 
      manufacturerCategories.newEnergy.includes(company.name)
    );
    
    // 计算各企业的总销量，根据筛选条件
    const companyStats: any[] = [];
    
    newEnergyCompanies.forEach(company => {
      // 计算该企业的总销量，根据选择的动力类型和价格区间进行筛选
      const companySales = carModelData
        .filter(item => {
          if (item.manufacturer !== company.name) return false;
          
          // 检查动力类型
          if (!selectedEnergyTypes.includes(item.energyType)) return false;
          
          // 检查价格区间
          const avgPrice = (item.minPrice + item.maxPrice) / 2;
          const priceRange = PRICE_RANGES.find(range => 
            avgPrice >= range.min && avgPrice < range.max
          );
          
          if (!priceRange || !selectedPriceRanges.includes(priceRange.name)) return false;
          
          return true;
        })
        .reduce((sum, item) => sum + item.sales, 0);
      
      companyStats.push({
        name: company.name,
        sales: companySales,
        color: company.color
      });
    });
    
    // 按销量排序
    return companyStats.sort((a, b) => b.sales - a.sales);
  };

// 获取按销量从高到低排序的数据，用于柱状图
  const getSortedDataForBarChart = () => {
    return [...getFilteredCompanyData()].sort((a, b) => b.sales - a.sales);
  };

  // 页面容器动画配置
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // 头部动画配置
  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 获取企业颜色
  const getCompanyColor = (name: string) => {
    const company = carCompanies.find(c => c.name === name);
    return company?.color || '#6b7280';
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, showPercentage = false }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // 计算该月份的总销量（用于百分比计算）
      let totalMonthlySales = 0;
      if (showPercentage && payload.length > 0) {
        totalMonthlySales = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      }
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.name || data.month}</p>
          {payload.map((entry: any, index: number) => {
            const isPercentage = typeof entry.value === 'number' && entry.value < 100 && entry.name !== '销量';
            const percentageText = showPercentage && totalMonthlySales > 0 
              ? ` (${((entry.value / totalMonthlySales) * 100).toFixed(1)}%)` 
              : '';
            
            return (
              <p key={index} className="flex items-center mt-1">
                <span 
                  className="w-3 h-3 inline-block mr-2" 
                  style={{ backgroundColor: entry.color }}
                ></span>
                <span className="text-sm text-gray-600 dark:text-gray-300">{entry.name}:</span>
                <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                  {isPercentage ? `${entry.value}%` : `${formatNumber(entry.value)} 辆${percentageText}`}
                </span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // 自定义折线图Tooltip
  const LineChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // 直接计算该月份的总销量，不使用useMemo
      const monthTotalSales = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.month}</p>
          {payload.map((entry: any, index: number) => {
            // 检查当前条目是否是悬停的车企
            const isHovered = hoveredCompany && entry.name === hoveredCompany;
            
            // 获取对应的百分比数据
            const percentage = data[`${entry.name}Percentage`] || 0;
            
            return (
              <p 
                key={index} 
                className={`flex items-center mt-1 ${isHovered ? 'font-bold' : ''}`}
              >
                <span 
                  className="w-3 h-3 inline-block mr-2" 
                  style={{ backgroundColor: entry.color }}
                ></span>
                <span className={`text-sm ${isHovered ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
                  {entry.name}:
                </span>
                <span className={`ml-2 text-sm ${isHovered ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium text-gray-900 dark:text-white'}`}>
                  {formatNumber(entry.value)} 辆 ({percentage}%)
                </span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // 自定义品牌车型销量折线图Tooltip
  const BrandModelsTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (<div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.month}</p>
          {payload.map((entry: any, index: number) => {
            // 检查当前条目是否是悬停的车型
            const isHovered = hoveredModel && entry.name === hoveredModel;
            
            return (
              <p 
                key={index} 
                className={`flex items-center mt-1 ${isHovered ? 'font-bold' : ''}`}
              >
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
        </div>
      );
    }
    return null;
  };

  // 获取能源类型的图标和颜色
  const getEnergyTypeInfo = (energyType: string) => {
    const energyTypeConfig = energyTypes.find(type => type.name === energyType);
    if (energyTypeConfig) {
      // 为每种能源类型定义颜色类
      const colorMap: Record<string, string> = {
        '纯电': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        '插混': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        '燃油': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        '增程': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      };
      return { 
        icon: energyTypeConfig.icon || 'fa-question', 
        color: colorMap[energyType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' 
      };
    }
    return { icon: 'fa-question', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
  };

  // 生成随机颜色
  const generateColor = (index: number): string => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#84cc16', '#06b6d4', '#a855f7'];
    return colors[index % colors.length];
  };

  // 筛选品牌列表
  const getFilteredBrands = () => {
    if (!searchTerm) {
      return manufacturerCategories.newEnergy;
    }
    return manufacturerCategories.newEnergy.filter(brand => 
      brand.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${theme}`}>
      <motion.div 
        className="container mx-auto px-4 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 页面头部 */}
        <motion.div 
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
          variants={headerVariants}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              车企销量数据分析平台
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              全面分析各车企销量表现、市场份额和增长趋势
            </p>
          </div>
           <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <DateFilter 
             onDateRangeChange={handleDateRangeChange}
             defaultStartDate={dateRange.startDate}
             defaultEndDate={dateRange.endDate}
           />
          <button
            onClick={toggleTheme}
            className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-shadow"
            aria-label="切换主题"
          >
            <i className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'} text-gray-700 dark:text-gray-300`}></i>
          </button>
        </div>
        </motion.div>

        {/* 视图选择器 */}
        <ViewSelector currentView="new-energy-companies" dateRange={dateRange} />

        {/* 视图标题 */}
        <motion.div 
          className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <i className="fa-solid fa-leaf text-emerald-500 mr-2"></i>
            新势力品牌情况
          </h2>
        </motion.div>

         {/* 新势力品牌车型销量模块 */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-wrap justify-between items-start md:items-center gap-4 mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">新势力品牌车型销量</h3>
          
            {/* 品牌筛选器 */}
            <div className="relative w-full md:w-auto">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowBrandDropdown(true);
                  }}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors pr-12"
                  placeholder="搜索品牌..."
                />
                <button
                  onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <i className={`fa-solid ${showBrandDropdown ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                </button>
              </div>
              
              {showBrandDropdown && (
                <div className="absolute z-50 mt-2 w-full md:w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {getFilteredBrands().map(brand => (
                    <div
                      key={brand}
                      className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer ${
                        selectedBrand === brand ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                      }`}
                      onClick={() => {
                        setSelectedBrand(brand);
                        setSearchTerm(brand);
                        setShowBrandDropdown(false);
                      }}
                    >
                      <span className="text-sm font-medium">{brand}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* 图表区域 */}
          {isLoading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-gray-500 dark:text-gray-400 flex items-center">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                <span>加载数据中...</span>
              </div>
            </div>
          ) : (
            <div className="h-[400px] overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
              {brandModelsData.length > 0 ? (
                <div className="min-w-[800px] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={brandModelsData}
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
                      <Tooltip 
                        content={<BrandModelsTooltip />} 
                        contentStyle={{ pointerEvents: 'none' }}
                        offset={100}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: 10 }}
                        formatter={(value) => <span className={`text-sm ${hoveredModel === value ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{value}</span>}
                      />
                      {Object.keys(brandModelsData[0])
                        .filter(key => key !== 'month')
                        .map((modelName, index) => {
                          const isHovered = hoveredModel === modelName;
                          return (
                            <Line 
                              key={modelName}
                              type="monotone" 
                              dataKey={modelName} 
                              stroke={generateColor(index)}
                              strokeWidth={isHovered ? 4 : 2}
                              dot={{ 
                                fill: generateColor(index), 
                                r: isHovered ? 6 : 4,
                                stroke: isHovered ? generateColor(index) : 'none',
                                strokeWidth: 2
                              }}
                              activeDot={{ 
                                r: 8,
                                stroke: '#fff', 
                                strokeWidth: 2 
                              }}
                              animationDuration={1500}
                              // 添加鼠标事件处理器
                              onMouseEnter={() => handleModelMouseEnter(modelName)}
                              onMouseLeave={() => handleModelMouseLeave()}
                              style={{ 
                                opacity: hoveredModel ? (isHovered ? 1 : 0.4) : 1,
                                transition: 'all 0.2s ease-in-out',
                                cursor: 'pointer'
                              }}
                            />
                          );
                        })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
                </div>
              )}
            </div>
          )}
          
          {/* 图表标题 - 显示所选品牌 */}
          <div className="mt-4 text-center text-lg font-semibold text-gray-900 dark:text-white">
            {selectedBrand}车型月度销量趋势
          </div>
          
          {/* 滚动提示 */}
          {brandModelsData.length > 0 && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
              <span>左右滑动可查看更多数据</span>
              <div className="flex items-center">
                <i className="fa-solid fa-hand-point-left mr-1"></i>
                <i className="fa-solid fa-hand-point-right"></i>
              </div>
            </div>
          )}
        </motion.div>

         {/* 新势力企业销量占比模块 - 包含柱状图、圆饼图和筛选器 */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex flex-wrap justify-between items-start md:items-center gap-4 mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">新势力品牌销量占比</h3>
          
            {/* 动力类型和价格区间筛选器 */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {/* 动力类型筛选下拉框 */}
              <div className="relative w-full md:w-auto">
                <button
                  onClick={() => setShowEnergyDropdown(!showEnergyDropdown)}
                  className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    动力类型 ({selectedEnergyTypes.length}/{energyTypes.length})
                  </span>
                  <span className={`text-sm transition-transform ${showEnergyDropdown ? 'rotate-180' : ''}`}>
                    <i className="fa-solid fa-chevron-down"></i>
                  </span>
                </button>
                {showEnergyDropdown && (
                  <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2">
                      {energyTypes.map(energyType => (
                        <label
                          key={energyType.id}
                          className="flex items-center p-2 mb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEnergyTypes.includes(energyType.name)}
                            onChange={() => handleEnergyTypeToggle(energyType.name)}
                            className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                            disabled={selectedEnergyTypes.length === 1 && selectedEnergyTypes[0] === energyType.name}
                          />
                          <div className="ml-3 flex items-center">
                            <div 
                              className="w-6 h-6 rounded-full mr-2 flex items-center justify-center"
                              style={{ backgroundColor: energyType.color }}
                            >
                              <i className={`fa-solid ${energyType.icon || 'fa-question'} text-white text-xs`}></i>
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{energyType.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 价格区间筛选下拉框 */}
              <div className="relative w-full md:w-auto">
                <button
                  onClick={() => setShowPriceDropdown(!showPriceDropdown)}
                  className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    价格区间 ({selectedPriceRanges.length}/{PRICE_RANGES.length})
                  </span>
                  <span className={`text-sm transition-transform ${showPriceDropdown ? 'rotate-180' : ''}`}>
                    <i className="fa-solid fa-chevron-down"></i>
                  </span>
                </button>
                {showPriceDropdown && (
                  <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2">
                      {PRICE_RANGES.map(range => (
                        <label
                          key={range.name}
                          className="flex items-center p-2 mb-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPriceRanges.includes(range.name)}
                            onChange={() => handlePriceRangeToggle(range.name)}
                            className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                            disabled={selectedPriceRanges.length === 1 && selectedPriceRanges[0] === range.name}
                          />
                          <div className="ml-3 flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: range.color }}
                            ></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{range.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 图表区域 - 柱状图在上，圆饼图在下 */}
          <div className="grid grid-cols-1 gap-8">
            {/* 柱状图 - 展示厂商销量，按从低到高排序 */}
            {isLoading ? (
              <div className="flex items-center justify-center h-[350px]">
                <div className="text-gray-500 dark:text-gray-400 flex items-center">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  <span>加载数据中...</span>
                </div>
              </div>
            ) : (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getSortedDataForBarChart()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#6b7280' }} 
                      axisLine={{ stroke: '#e5e7eb' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fill: '#6b7280' }} 
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={(value) => formatNumber(value)}
                    /><Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10 }}
                      formatter={(value) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}
                    />
                     <Bar 
                      dataKey="sales" 
                      name="销量" 
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      animationDuration={1500}
                      label={{ 
                        position: 'top',
                        fill: '#6b7280',
                        fontSize: 12,
                        formatter: (value: number) => formatNumber(value)
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* 圆饼图 */}
            {isLoading ? (
              <div className="flex items-center justify-center h-[350px]">
                <div className="text-gray-500 dark:text-gray-400 flex items-center">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  <span>加载数据中...</span>
                </div>
              </div>
            ) : (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getFilteredCompanyData()}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="sales"
                      animationDuration={1500}
                      animationBegin={200}
                      label={({ name, value, percent }) => {
                        // 计算占比
                        const percentage = (percent * 100).toFixed(1);
                        return `${name}: ${formatNumber(value)} 辆 (${percentage}%)`;
                      }}
                    >
                      {getFilteredCompanyData().map((entry, index) => {
                        // 使用与柱状图一致的厂商颜色
                        const company = carCompanies.find(c => c.name === entry.name);
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={company?.color || '#8884d8'} 
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </motion.div>

        {/* 新势力品牌月度销量情况模块 */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">新势力品牌月度销量情况</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-gray-500 dark:text-gray-400 flex items-center">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                <span>加载数据中...</span>
              </div>
            </div>
          ) : monthlyTrendData.length > 0 ? (
            <div className="h-[500px] overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
              {monthlyTrendData.length > 0 ? (
                <div className="min-w-[900px] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyTrendData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      onMouseLeave={handleLineMouseLeave}
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
                     <Tooltip 
                      content={<LineChartTooltip />} 
                      contentStyle={{ pointerEvents: 'none' }}
                      offset={100}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10 }}
                        formatter={(value) => (
                          <span className={`text-sm ${hoveredCompany === value ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {value}
                          </span>
                        )}
                      />
                      {manufacturerCategories.newEnergy.map((companyName) => {
                        const company = carCompanies.find(c => c.name === companyName);
                        return (
                          <Line 
                            key={companyName} 
                            type="monotone" 
                            dataKey={companyName} 
                            stroke={company?.color || '#6b7280'}
                            strokeWidth={hoveredCompany === companyName ? 4 : 2}
                            dot={{ 
                              fill: company?.color || '#6b7280', 
                              r: hoveredCompany === companyName ? 6 : 4,
                              stroke: hoveredCompany === companyName ? company?.color || '#6b7280' : 'none',
                              strokeWidth: 2
                            }}
                            activeDot={{ 
                              r: 8,
                              stroke: '#fff', 
                              strokeWidth: 2 
                            }}
                            animationDuration={1500}
                            // 添加鼠标事件处理器
                            onMouseEnter={() => handleLineMouseEnter(companyName)}
                            onMouseLeave={handleLineMouseLeave}
                            style={{ 
                              opacity: hoveredCompany ? (hoveredCompany === companyName ? 1 : 0.4) : 1,
                              transition: 'all 0.2s ease-in-out',
                              cursor: 'pointer'
                            }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[400px]">
              <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
            </div>
          )}
          
           <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
             <p>
               <i className="fa-solid fa-circle-info mr-1"></i>
               图表展示各新势力品牌月度销量趋势，包含销量和占比信息。鼠标悬停可高亮对应车企的信息。
             </p>
             <div className="flex items-center">
               <span className="mr-2">左右滑动查看更多数据</span>
               <i className="fa-solid fa-hand-point-left mr-1"></i>
               <i className="fa-solid fa-hand-point-right"></i>
             </div>
           </div>
        </motion.div>

        {/* 价格区间分布和能源类型分布并排显示 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 价格区间分布 */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">价格区间分布</h3>
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-gray-500 dark:text-gray-400 flex items-center">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  <span>加载数据中...</span>
                </div>
              </div>
            ) : priceRangeData.length > 0 ? (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priceRangeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="销量"
                      animationDuration={1500}
                      animationBegin={200}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {priceRangeData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                     <Tooltip 
                      content={<CustomTooltip />} 
                      contentStyle={{ pointerEvents: 'none' }}
                      offset={100}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
              </div>
            )}
          </motion.div>

          {/* 能源类型分布 */}
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">能源类型分布</h3>
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-gray-500 dark:text-gray-400 flex items-center">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  <span>加载数据中...</span>
                </div>
              </div>
            ) : energyTypeData.length > 0 ? (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={energyTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="销量"
                      animationDuration={1500}
                      animationBegin={200}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {energyTypeData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
              </div>
            )}
          </motion.div>
        </div>

         {/* 新势力品牌车型销量情况模块 */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
           <NewEnergyBrandModelsTable dateRange={dateRange} theme={theme} />
        </motion.div>

        {/* 页脚 */}
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2026 车企销量数据分析平台 | 数据更新时间: {new Date().toLocaleDateString()} | 数据来源: 文件数据
          </p>
        </div>
      </motion.div>
  </div>
  );
}