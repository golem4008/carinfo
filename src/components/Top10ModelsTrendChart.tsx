import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; // 移除 Legend 导入
import { motion } from 'framer-motion';
import { DateRange, CarCompany } from '../types';
import { getCurrentCarModelData, formatMonthWithYear, getLatestModelPrice } from '../mocks/data';
import { energyTypes } from '../mocks/energyTypes';
import DateFilter from './DateFilter';

// 定义价格区间
const PRICE_RANGES = [
  { name: '10万以下', min: 0, max: 10 },
  { name: '10~15万', min: 10, max: 15 },
  { name: '15~25万', min: 15, max: 25 },
  { name: '25~35万', min: 25, max: 35 },
  { name: '35~50万', min: 35, max: 50 },
  { name: '50万以上', min: 50, max: Infinity }
];

// 车型数据接口
interface CarModel {
  name: string;
  sales: number;
  brand: string;
  manufacturer: string;
  energyType: string;
  price: string;
  minPrice: number;
  maxPrice: number;
  rank: number;
  percentage: number;
}

interface Top10ModelsTrendChartProps {
  className?: string;
  dateRange?: DateRange;
  selectedCompany: CarCompany;
}

const Top10ModelsTrendChart: React.FC<Top10ModelsTrendChartProps> = ({
  className = '',
  dateRange,
  selectedCompany
}) => {
  // 筛选状态
  const [selectedEnergyTypes, setSelectedEnergyTypes] = useState<string[]>(energyTypes.map(type => type.name));
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>(PRICE_RANGES.map(range => range.name));
  const [showEnergyDropdown, setShowEnergyDropdown] = useState<boolean>(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState<boolean>(false);
  
  // 新增：控制是否合并能源类型数据的开关状态（默认不合并）
  const [isMergeEnergyType, setIsMergeEnergyType] = useState<boolean>(false);
  
  // 图表数据状态
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // 新增：存储TOP10车型名称（用于渲染自定义图例）
  const [top10ModelNames, setTop10ModelNames] = useState<string[]>([]);
  
  // 追踪当前悬停的车型（用于高亮）
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  // 加载车型数据 —— 依赖添加 isMergeEnergyType，开关变化时重新加载
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 获取车型数据
        const carModelData = getCurrentCarModelData(dateRange);
        
        // 筛选出选中车企的数据
        let companyModels = carModelData.filter(item => 
          item.manufacturer === selectedCompany.name
        );
        
        // 补充同一车型多能源版本的示例数据
        if (companyModels.length === 0 || companyModels.every(model => model.sales === 0)) {
          // 华为/问界：M7纯电+增程版本（同一车型不同能源）
          if (selectedCompany.name === '华为') {
            companyModels = [
              // M7增程版
              {
                manufacturer: '华为',
                brand: '问界',
                modelName: 'M7',
                vehicleType: 'SUV',
                energyType: '增程',
                sales: 8000,
                minPrice: 36.00,
                maxPrice: 40.00,
                month: '1月',
                year: 2025
              },
              {
                manufacturer: '华为',
                brand: '问界',
                modelName: 'M7',
                vehicleType: 'SUV',
                energyType: '增程',
                sales: 7500,
                minPrice: 36.00,
                maxPrice: 40.00,
                month: '2月',
                year: 2025
              },
              {
                manufacturer: '华为',
                brand: '问界',
                modelName: 'M7',
                vehicleType: 'SUV',
                energyType: '增程',
                sales: 7000,
                minPrice: 36.00,
                maxPrice: 40.00,
                month: '3月',
                year: 2025
              },
              // M7纯电版
              {
                manufacturer: '华为',
                brand: '问界',
                modelName: 'M7',
                vehicleType: 'SUV',
                energyType: '纯电',
                sales: 6000,
                minPrice: 36.00,
                maxPrice: 40.00,
                month: '1月',
                year: 2025
              },
              {
                manufacturer: '华为',
                brand: '问界',
                modelName: 'M7',
                vehicleType: 'SUV',
                energyType: '纯电',
                sales: 6500,
                minPrice: 36.00,
                maxPrice: 40.00,
                month: '2月',
                year: 2025
              },
              {
                manufacturer: '华为',
                brand: '问界',
                modelName: 'M7',
                vehicleType: 'SUV',
                energyType: '纯电',
                sales: 7000,
                minPrice: 36.00,
                maxPrice: 40.00,
                month: '3月',
                year: 2025
              }
            ];
          } 
          // 特斯拉示例（单能源类型）
          else if (selectedCompany.name === '特斯拉') {
            companyModels = [
              {
                manufacturer: '特斯拉',
                brand: '特斯拉',
                modelName: 'Model Y',
                vehicleType: 'SUV',
                energyType: '纯电',
                sales: 4000,
                minPrice: 25.99,
                maxPrice: 28.99,
                month: '1月',
                year: 2025
              },
              {
                manufacturer: '特斯拉',
                brand: '特斯拉',
                modelName: 'Model Y',
                vehicleType: 'SUV',
                energyType: '纯电',
                sales: 5000,
                minPrice: 25.99,
                maxPrice: 28.99,
                month: '2月',
                year: 2025
              },
              {
                manufacturer: '特斯拉',
                brand: '特斯拉',
                modelName: 'Model Y',
                vehicleType: 'SUV',
                energyType: '纯电',
                sales: 6500,
                minPrice: 25.99,
                maxPrice: 28.99,
                month: '3月',
                year: 2025
              },
              {
                manufacturer: '特斯拉',
                brand: '特斯拉',
                modelName: 'Model 3',
                vehicleType: '轿车',
                energyType: '纯电',
                sales: 8000,
                minPrice: 21.99,
                maxPrice: 25.99,
                month: '1月',
                year: 2025
              },
              {
                manufacturer: '特斯拉',
                brand: '特斯拉',
                modelName: 'Model 3',
                vehicleType: '轿车',
                energyType: '纯电',
                sales: 9000,
                minPrice: 21.99,
                maxPrice: 25.99,
                month: '2月',
                year: 2025
              },
              {
                manufacturer: '特斯拉',
                brand: '特斯拉',
                modelName: 'Model 3',
                vehicleType: '轿车',
                energyType: '纯电',
                sales: 10000,
                minPrice: 21.99,
                maxPrice: 25.99,
                month: '3月',
                year: 2025
              }
            ];
          } 
          // 理想示例
          else if (selectedCompany.name === '理想') {
            companyModels = [
              {
                manufacturer: '理想',
                brand: '理想',
                modelName: 'L8',
                vehicleType: 'SUV',
                energyType: '增程',
                sales: 12345,
                minPrice: 34.99,
                maxPrice: 39.99,
                month: '1月',
                year: 2025
              },
              {
                manufacturer: '理想',
                brand: '理想',
                modelName: 'L8',
                vehicleType: 'SUV',
                energyType: '增程',
                sales: 10345,
                minPrice: 34.99,
                maxPrice: 39.99,
                month: '2月',
                year: 2025
              },
              {
                manufacturer: '理想',
                brand: '理想',
                modelName: 'L8',
                vehicleType: 'SUV',
                energyType: '增程',
                sales: 8345,
                minPrice: 34.99,
                maxPrice: 39.99,
                month: '3月',
                year: 2025
              }
            ];
          }
          // 其他车企通用示例（同一车型多能源版本）
          else {
            companyModels = [
              // 主力车型A-纯电
              {
                manufacturer: selectedCompany.name,
                brand: selectedCompany.name,
                modelName: '主力车型A',
                vehicleType: 'SUV',
                energyType: '纯电',
                sales: 5000,
                minPrice: 20,
                maxPrice: 30,
                month: '1月',
                year: 2025
              },
              {
                manufacturer: selectedCompany.name,
                brand: selectedCompany.name,
                modelName: '主力车型A',
                vehicleType: 'SUV',
                energyType: '纯电',
                sales: 5500,
                minPrice: 20,
                maxPrice: 30,
                month: '2月',
                year: 2025
              },
              {
                manufacturer: selectedCompany.name,
                brand: selectedCompany.name,
                modelName: '主力车型A',
                vehicleType: 'SUV',
                energyType: '纯电',
                sales: 6000,
                minPrice: 20,
                maxPrice: 30,
                month: '3月',
                year: 2025
              },
              // 主力车型A-插混
              {
                manufacturer: selectedCompany.name,
                brand: selectedCompany.name,
                modelName: '主力车型A',
                vehicleType: 'SUV',
                energyType: '插混',
                sales: 3000,
                minPrice: 18,
                maxPrice: 28,
                month: '1月',
                year: 2025
              },
              {
                manufacturer: selectedCompany.name,
                brand: selectedCompany.name,
                modelName: '主力车型A',
                vehicleType: 'SUV',
                energyType: '插混',
                sales: 3500,
                minPrice: 18,
                maxPrice: 28,
                month: '2月',
                year: 2025
              },
              {
                manufacturer: selectedCompany.name,
                brand: selectedCompany.name,
                modelName: '主力车型A',
                vehicleType: 'SUV',
                energyType: '插混',
                sales: 4000,
                minPrice: 18,
                maxPrice: 28,
                month: '3月',
                year: 2025
              }
            ];
          }
        }
        
        // 根据能源类型和价格区间筛选数据
        const filteredModels = companyModels.filter(model => {
          const energyMatch = selectedEnergyTypes.includes(model.energyType);
          
          const priceRange = PRICE_RANGES.find(range => 
            model.minPrice >= range.min && model.maxPrice < range.max
          );
          const priceMatch = priceRange ? selectedPriceRanges.includes(priceRange.name) : true;
          
          return energyMatch && priceMatch;
        });
        
        // 核心修改：根据开关状态动态生成聚合key
        const modelMonthMap = new Map<string, Map<string, number>>();
        
        filteredModels.forEach(item => {
          // 合并模式：仅用车型名；分开模式：车型名(能源类型)
          const modelKey = isMergeEnergyType 
            ? item.modelName 
            : `${item.modelName}(${item.energyType})`;
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
        
        // 获取销量最高的前10个车型
        const modelSales: { name: string; sales: number }[] = [];
        modelMonthMap.forEach((monthMap, modelName) => {
          const totalSales = Array.from(monthMap.values()).reduce((sum, sales) => sum + sales, 0);
          modelSales.push({ name: modelName, sales: totalSales });
        });
        
        // 按总销量排序，取前10个
        const top10Models = modelSales
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 10)
          .map(item => item.name);
        
        // 存储TOP10车型名称（用于渲染自定义图例）
        setTop10ModelNames(top10Models);
        
        // 过滤图表数据，只保留前10个车型
        const finalChartData = chartDataFormatted.map(dataPoint => {
          const filteredData: any = { month: dataPoint.month };
          
          top10Models.forEach(modelName => {
            filteredData[modelName] = dataPoint[modelName] || 0;
          });
          
          return filteredData;
        });
        
        setChartData(finalChartData);
      } catch (error) {
        console.error('获取数据失败:', error);
        setChartData([]);
        setTop10ModelNames([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedCompany, dateRange, selectedEnergyTypes, selectedPriceRanges, isMergeEnergyType]);

  // 处理能源类型选择变化
  const handleEnergyTypeToggle = (energyType: string) => {
    setSelectedEnergyTypes(prev => {
      if (prev.includes(energyType)) {
        if (prev.length > 1) {
          return prev.filter(type => type !== energyType);
        }
        return prev;
      } else {
        return [...prev, energyType];
      }
    });
  };
  
  const selectAllEnergyTypes = () => {
    setSelectedEnergyTypes(energyTypes.map(type => type.name));
  };
  
  const clearAllEnergyTypes = () => {
    if (energyTypes.length > 0) {
      setSelectedEnergyTypes([energyTypes[0].name]);
    }
  };

  // 处理价格区间选择变化
  const handlePriceRangeToggle = (priceRange: string) => {
    setSelectedPriceRanges(prev => {
      if (prev.includes(priceRange)) {
        if (prev.length > 1) {
          return prev.filter(range => range !== priceRange);
        }
        return prev;
      } else {
        return [...prev, priceRange];
      }
    });
  };
  
  const selectAllPriceRanges = () => {
    setSelectedPriceRanges(PRICE_RANGES.map(range => range.name));
  };
  
  const clearAllPriceRanges = () => {
    if (PRICE_RANGES.length > 0) {
      setSelectedPriceRanges([PRICE_RANGES[0].name]);
    }
  };

  // 格式化数字
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 获取能源类型信息
  const getEnergyTypeInfo = (energyType: string) => {
    const energyTypeConfig = energyTypes.find(type => type.name === energyType);
    if (energyTypeConfig) {
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
    return { icon: 'fa-question', color: 'bg-gray-100 text-gray-800 dark:text-gray-300' };
  };

  // 生成随机颜色（和折线颜色保持一致）
  const generateColor = (index: number): string => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#84cc16', '#06b6d4', '#a855f7'];
    return colors[index % colors.length];
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: any, index: number) => {
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

  // 图表动画配置
  const chartVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8 } },
  };

  // 自定义图例项点击/悬停处理
  const handleLegendMouseEnter = (modelName: string) => {
    setHoveredModel(modelName);
  };
  
  const handleLegendMouseLeave = () => {
    setHoveredModel(null);
  };

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 ${className}`}
    >
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
         <div>
           <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">TOP10车型销量趋势</h3>
           <p className="text-sm text-gray-500 dark:text-gray-400">
             {selectedCompany.name}销量TOP10车型{isMergeEnergyType ? '（合并能源类型）' : '（分能源类型）'}的月度销量变化趋势
           </p>
         </div>
       </div>
        
        {/* 筛选栏：合并能源类型开关 + 能源/价格筛选 */}
        <div className="flex flex-wrap gap-4 mt-4 md:mt-0 w-full md:w-auto">
          {/* 合并能源类型开关 */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <input
              type="checkbox"
              id="merge-energy-type"
              checked={isMergeEnergyType}
              onChange={(e) => setIsMergeEnergyType(e.target.checked)}
              className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="merge-energy-type"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              合并能源类型数据
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                （勾选后同一车型不同能源销量合并）
              </span>
            </label>
          </div>

          {/* 能源类型筛选下拉框 */}
          <div className="relative w-full md:w-auto">
            <button
              onClick={() => setShowEnergyDropdown(!showEnergyDropdown)}
              className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                能源类型 ({selectedEnergyTypes.length}/{energyTypes.length})
              </span>
              <span className={`text-sm transition-transform ${showEnergyDropdown ? 'rotate-180' : ''}`}>
                <i className="fa-solid fa-chevron-down"></i>
              </span>
            </button>
            {showEnergyDropdown && (
              <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between">
                  <button
                    onClick={selectAllEnergyTypes}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    全选
                  </button>
                  <button
                    onClick={clearAllEnergyTypes}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    清除
                  </button>
                </div>
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
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between">
                  <button
                    onClick={selectAllPriceRanges}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    全选
                  </button>
                  <button
                    onClick={clearAllPriceRanges}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    清除
                  </button>
                </div>
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
                        <span className="text-sm text-gray-700 dark:text-gray-300">{range.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 自定义固定图例：不随图表滚动 */}
        {!isLoading && top10ModelNames.length > 0 && (
          <div className="mt-4 mb-2 px-2">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {top10ModelNames.map((modelName, index) => {
                const isHovered = hoveredModel === modelName;
                return (
                  <div
                    key={modelName}
                    className="flex items-center cursor-pointer"
                    onMouseEnter={() => handleLegendMouseEnter(modelName)}
                    onMouseLeave={handleLegendMouseLeave}
                  >
                    <span
                      className="w-3 h-3 inline-block mr-1.5"
                      style={{ backgroundColor: generateColor(index) }}
                    ></span>
                    <span
                      className={`text-sm ${
                        isHovered 
                          ? 'font-bold text-blue-600 dark:text-blue-400' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {modelName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      
      {/* 图表容器：横向滚动，图例已抽离 */}
      <div className="h-[400px] overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
        <div className="min-w-[800px] h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 dark:text-gray-400 flex items-center">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                <span>加载数据中...</span>
              </div>
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
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
                  content={<CustomTooltip />} 
                  contentStyle={{ pointerEvents: 'none' }}
                  offset={100}
                />
                {/* 移除内置Legend组件 */}
                {Object.keys(chartData[0])
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
                        onMouseEnter={() => setHoveredModel(modelName)}
                        onMouseLeave={() => setHoveredModel(null)}
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 滚动提示 */}
      {chartData.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
          <span>左右滑动可查看更多数据</span>
          <div className="flex items-center">
            <i className="fa-solid fa-hand-point-left mr-1"></i>
            <i className="fa-solid fa-hand-point-right"></i>
          </div>
        </div>
      )}
      
      {/* 模块说明 */}
      <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
        <p>
          <i className="fa-solid fa-circle-info mr-1"></i>
          图表展示{selectedCompany.name}销量排名前10的车型在选定时间范围内的月度销量趋势。
          {isMergeEnergyType 
            ? '已开启「合并能源类型数据」，同一车型不同能源版本销量将合并为一条线展示；' 
            : '未开启「合并能源类型数据」，同一车型不同能源版本将作为独立线条展示；'}
          可通过能源类型和价格区间进行筛选，鼠标悬浮图例/折线可高亮对应车型数据。
        </p>
      </div>
    </motion.div>
  );
};

export default Top10ModelsTrendChart;