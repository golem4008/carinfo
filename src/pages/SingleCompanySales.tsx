import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import { DateRange, CarCompany } from '../types';
import DateFilter from '../components/DateFilter';
import { useLocation } from 'react-router-dom';
import ViewSelector from '../components/ViewSelector';
import { carCompanies, getCurrentCarModelData, getDataDateRange, getLatestModelPrice } from '../mocks/data';
import { energyTypes } from '../mocks/energyTypes';
import Top10ModelsTrendChart from '../components/Top10ModelsTrendChart';
import MonthlyTop10ModelsTable from '../components/MonthlyTop10ModelsTable';
import EnergyTypeDistributionChart from '../components/EnergyTypeDistributionChart';
import CarCompanyByPriceRangeChart from '../components/CarCompanyByPriceRangeChart';

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

export default function SingleCompanySales() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  
  const initialDateRange = location.state?.dateRange || getDataDateRange();
  
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [selectedCompany, setSelectedCompany] = useState<CarCompany>(carCompanies[0]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredCompanies, setFilteredCompanies] = useState<CarCompany[]>(carCompanies);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [carModels, setCarModels] = useState<CarModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [selectedEnergyTypes, setSelectedEnergyTypes] = useState<string[]>(energyTypes.map(type => type.name));
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>(PRICE_RANGES.map(range => range.name));
  const [showEnergyDropdown, setShowEnergyDropdown] = useState<boolean>(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState<boolean>(false);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredCompanies(carCompanies);
    } else {
      const filtered = carCompanies.filter(company => 
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCompanies(filtered);
    }
  }, [searchTerm]);

  // 加载车型数据 —— 🔴 车型名称恢复原样，不再加(能源类型)
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      try {
        const carModelData = getCurrentCarModelData(dateRange);
        const companyModels = carModelData.filter(item => 
          item.manufacturer === selectedCompany.name
        );
        
        const modelSalesMap = new Map<string, any>();
        
        companyModels.forEach(item => {
          const validModelName = item.modelName && item.modelName !== '暂无车型数据' 
            ? item.modelName 
            : `${item.brand} ${item.manufacturer}系列`;
          
          // 🔴 key 依然用 车型+能源类型，保证分行，但名称只保留车型名
          const key = `${validModelName}-${item.energyType}`;
          
          if (modelSalesMap.has(key)) {
            const existingModel = modelSalesMap.get(key);
            existingModel.sales += item.sales;
          } else {
            const latestPrice = getLatestModelPrice(
              carModelData,
              item.manufacturer,
              item.brand,
              item.modelName,
              dateRange
            );
            
            // 🔴 这里只存原始车型名，不加后缀
            modelSalesMap.set(key, {
              name: validModelName,
              sales: item.sales,
              brand: item.brand,
              manufacturer: item.manufacturer,
              energyType: item.energyType,
              price: `${latestPrice?.minPrice.toFixed(2)}-${latestPrice?.maxPrice.toFixed(2)}万`,
              minPrice: latestPrice?.minPrice || item.minPrice,
              maxPrice: latestPrice?.maxPrice || item.maxPrice
            });
          }
        });
        
        let sortedModels = Array.from(modelSalesMap.values())
          .sort((a, b) => b.sales - a.sales);
        
        if (sortedModels.length === 0 || sortedModels.every(model => model.sales === 0)) {
          if (selectedCompany.name === '华为') {
            sortedModels = [
              { name: 'M7', sales: 8000, brand: '问界', manufacturer: '华为', energyType: '增程', price: '36.00-40.00万', minPrice: 36, maxPrice: 40 },
              { name: 'M7', sales: 6000, brand: '问界', manufacturer: '华为', energyType: '纯电', price: '36.00-40.00万', minPrice: 36, maxPrice: 40 },
            ];
          } else if (selectedCompany.name === '特斯拉') {
            sortedModels = [
              { name: 'Model Y', sales: 4000, brand: '特斯拉', manufacturer: '特斯拉', energyType: '纯电', price: '25.99-28.99万', minPrice: 25.99, maxPrice: 28.99 },
              { name: 'Model 3', sales: 8000, brand: '特斯拉', manufacturer: '特斯拉', energyType: '纯电', price: '21.99-25.99万', minPrice: 21.99, maxPrice: 25.99 },
            ];
          } else if (selectedCompany.name === '理想') {
            sortedModels = [{ name: 'L8', sales: 12345, brand: '理想', manufacturer: '理想', energyType: '增程', price: '34.99-39.99万', minPrice: 34.99, maxPrice: 39.99 }];
          } else {
            sortedModels = [
              { name: `${selectedCompany.name}主力车型`, sales: 5000, brand: selectedCompany.name, manufacturer: selectedCompany.name, energyType: '纯电', price: '20.00-30.00万', minPrice: 20, maxPrice: 30 },
              { name: `${selectedCompany.name}主力车型`, sales: 3000, brand: selectedCompany.name, manufacturer: selectedCompany.name, energyType: '插混', price: '18.00-28.00万', minPrice: 18, maxPrice: 28 },
            ];
          }
        }
        
        const totalSales = sortedModels.reduce((sum, model) => sum + model.sales, 0);
        const modelsWithRank = sortedModels.map((model, index) => ({
          ...model,
          rank: index + 1,
          percentage: totalSales > 0 ? ((model.sales / totalSales) * 100).toFixed(1) : 0
        }));
        
        setCarModels(modelsWithRank);
      } catch (error) {
        console.error('获取数据失败:', error);
        setCarModels([
          { name: `${selectedCompany.name}示例车型`, sales: 1000, brand: selectedCompany.name, manufacturer: selectedCompany.name, energyType: '纯电', price: '25.00-35.00万', minPrice: 25, maxPrice: 35, rank: 1, percentage: 100 },
          { name: `${selectedCompany.name}示例车型`, sales: 1000, brand: selectedCompany.name, manufacturer: selectedCompany.name, energyType: '增程', price: '25.00-35.00万', minPrice: 25, maxPrice: 35, rank: 2, percentage: 100 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedCompany, dateRange]);

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  const handleCompanySelect = (company: CarCompany) => {
    setSelectedCompany(company);
    setSearchTerm(company.name);
    setShowDropdown(false);
  };

  const handleEnergyTypeToggle = (energyType: string) => {
    setSelectedEnergyTypes(prev => {
      if (prev.includes(energyType)) {
        if (prev.length > 1) return prev.filter(t => t !== energyType);
        return prev;
      } else {
        return [...prev, energyType];
      }
    });
  };
  const selectAllEnergyTypes = () => setSelectedEnergyTypes(energyTypes.map(t => t.name));
  const clearAllEnergyTypes = () => setSelectedEnergyTypes([energyTypes[0].name]);

  const handlePriceRangeToggle = (priceRange: string) => {
    setSelectedPriceRanges(prev => {
      if (prev.includes(priceRange)) {
        if (prev.length > 1) return prev.filter(r => r !== priceRange);
        return prev;
      } else {
        return [...prev, priceRange];
      }
    });
  };
  const selectAllPriceRanges = () => setSelectedPriceRanges(PRICE_RANGES.map(r => r.name));
  const clearAllPriceRanges = () => setSelectedPriceRanges([PRICE_RANGES[0].name]);

  const getFilteredModels = () => {
    if (!carModels.length) return [];
    return carModels.filter(model => {
      const energyMatch = selectedEnergyTypes.includes(model.energyType);
      const priceRange = PRICE_RANGES.find(r => model.minPrice >= r.min && model.maxPrice < r.max);
      const priceMatch = priceRange ? selectedPriceRanges.includes(priceRange.name) : true;
      return energyMatch && priceMatch;
    });
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const headerVariants = { hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const getEnergyTypeInfo = (energyType: string) => {
    const cfg = energyTypes.find(t => t.name === energyType);
    const colorMap = {
      纯电: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      插混: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      燃油: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      增程: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    };
    return { icon: cfg?.icon || 'fa-question', color: colorMap[energyType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${theme}`}>
      <motion.div className="container mx-auto px-4 py-8" variants={containerVariants} initial="hidden" animate="visible">
        
        {/* 页面头部 / 视图选择 / 车企选择 都不变 */}
        <motion.div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8" variants={headerVariants}>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:white mb-2">车企销量数据分析平台</h1>
            <p className="text-gray-500 dark:text-gray-400">全面分析各车企销量表现、市场份额和增长趋势</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <DateFilter onDateRangeChange={handleDateRangeChange} defaultStartDate={dateRange.startDate} defaultEndDate={dateRange.endDate} />
            <button onClick={toggleTheme} className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-shadow">
              <i className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'} text-gray-700 dark:text-gray-300`}></i>
            </button>
          </div>
        </motion.div>

        <ViewSelector currentView="single-company" dateRange={dateRange} />

        <motion.div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4" initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.2 }}>
          <h2 className="text-xl font-semibold text-gray-900 dark:white flex items-center">
            <i className="fa-solid fa-building text-indigo-500 mr-2"></i>单车企数据分析
          </h2>
        </motion.div>

        <motion.div className="mb-8" initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.3 }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:white mb-4">选择要分析的车企</h3>
            <div className="relative">
              <input value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setShowDropdown(true);}}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                placeholder="输入车企名称搜索" />
              <button onClick={()=>setShowDropdown(!showDropdown)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                <i className={`fa-solid ${showDropdown ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              </button>
              {showDropdown && (
                <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-96 overflow-y-auto">
                  {filteredCompanies.map(c => (
                    <div key={c.id} className={`px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer ${selectedCompany.id===c.id?'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400':''}`}
                      onClick={()=>handleCompanySelect(c)}>
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full mr-3 flex items-center justify-center" style={{backgroundColor:c.color}}>
                          <span className="text-white text-xs">{c.name[0]}</span>
                        </div>
                        <span className="text-sm font-medium">{c.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div className="mb-8" initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.4 }}>
          <EnergyTypeDistributionChart dateRange={dateRange} selectedCompany={selectedCompany} />
        </motion.div>

        <motion.div className="mb-8" initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.45 }}>
          <CarCompanyByPriceRangeChart dateRange={dateRange} selectedCompany={selectedCompany} />
        </motion.div>

        {/* ======================= 🔴 车型销量排名表格（核心修改） ======================= */}
        <motion.div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 mb-8"
          initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.5 }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:white">车企车型销量排名</h3>
            <div className="flex flex-wrap gap-4 mt-4 md:mt-0 w-full md:w-auto">
              <div className="relative w-full md:w-auto">
                <button onClick={()=>setShowEnergyDropdown(!showEnergyDropdown)} className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">能源类型 ({selectedEnergyTypes.length}/{energyTypes.length})</span>
                  <i className="fa-solid fa-chevron-down"></i>
                </button>
                {showEnergyDropdown && (
                  <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between">
                      <button onClick={selectAllEnergyTypes} className="text-xs text-blue-600 dark:text-blue-400">全选</button>
                      <button onClick={clearAllEnergyTypes} className="text-xs text-red-600 dark:text-red-400">清除</button>
                    </div>
                    <div className="p-2">
                      {energyTypes.map(t => (
                        <label key={t.id} className="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer">
                          <input type="checkbox" checked={selectedEnergyTypes.includes(t.name)} onChange={()=>handleEnergyTypeToggle(t.name)}
                            disabled={selectedEnergyTypes.length===1 && selectedEnergyTypes[0]===t.name} className="w-4 h-4"/>
                          <div className="ml-3 flex items-center">
                            <div className="w-6 h-6 rounded-full mr-2" style={{backgroundColor:t.color}}></div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{t.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative w-full md:w-auto">
                <button onClick={()=>setShowPriceDropdown(!showPriceDropdown)} className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">价格区间 ({selectedPriceRanges.length}/{PRICE_RANGES.length})</span>
                  <i className="fa-solid fa-chevron-down"></i>
                </button>
                {showPriceDropdown && (
                  <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between">
                      <button onClick={selectAllPriceRanges} className="text-xs text-blue-600 dark:text-blue-400">全选</button>
                      <button onClick={clearAllPriceRanges} className="text-xs text-red-600 dark:text-red-400">清除</button>
                    </div>
                    <div className="p-2">
                      {PRICE_RANGES.map(r => (
                        <label key={r.name} className="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer">
                          <input type="checkbox" checked={selectedPriceRanges.includes(r.name)} onChange={()=>handlePriceRangeToggle(r.name)}
                            disabled={selectedPriceRanges.length===1 && selectedPriceRanges[0]===r.name} className="w-4 h-4"/>
                          <span className="text-sm text-gray-700 dark:text-gray-300 ml-3">{r.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 🔴 表格外层：固定高度 + 纵向滚动 */}
          <div className="overflow-x-auto">
            <div className="max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500 dark:text-gray-400 flex items-center">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i><span>加载数据中...</span>
                  </div>
                </div>
              ) : getFilteredModels().length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  {/* 🔴 表头冻结：sticky + top:0 + 层级 */}
                  <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase" style={{minWidth:'60px'}}>排名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase" style={{minWidth:'120px'}}>车型名称</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase" style={{minWidth:'100px'}}>品牌名称</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase" style={{minWidth:'100px'}}>能源类型</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase" style={{minWidth:'100px'}}>价格</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase" style={{minWidth:'100px'}}>销量</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase" style={{minWidth:'120px'}}>占比</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {getFilteredModels().map((model, index) => {
                      const ei = getEnergyTypeInfo(model.energyType);
                      return (
                        <tr key={`${model.name}-${model.energyType}-${index}`} className={index%2===0?'bg-white dark:bg-gray-800':'bg-gray-50 dark:bg-gray-750'}>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                              model.rank===1?'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300':
                              model.rank===2?'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300':
                              model.rank===3?'bg-amber-50 text-amber-700 dark:bg-amber-800/20 dark:text-amber-200':'bg-gray-50 text-gray-700 dark:bg-gray-750 dark:text-gray-300'
                            }`}>
                              <span className="font-medium">{model.rank}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                                <span className="text-white font-medium text-sm">{model.name[0]}</span>
                              </div>
                              {/* 🔴 只显示原始车型名，不加后缀 */}
                              <span className="text-sm font-medium text-gray-900 dark:white">{model.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900 dark:white">{model.brand}</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${ei.color}`}>
                              <i className={`fa-solid ${ei.icon} mr-1`}></i><span>{model.energyType}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:white">{model.price}</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:white">{formatNumber(model.sales)}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{width:`${model.percentage}%`}}></div>
                              </div>
                              <span className="ml-2 text-sm text-gray-900 dark:white">{model.percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
                </div>
              )}
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            注：同一车型不同能源版本将分行展示，可通过能源类型筛选查看对应版本。
          </p>
        </motion.div>
        {/* ========================================================================== */}

        <motion.div className="mb-8" initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.4 }}>
          <Top10ModelsTrendChart dateRange={dateRange} selectedCompany={selectedCompany} />
        </motion.div>

        <motion.div className="mb-8" initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.5 }}>
          <MonthlyTop10ModelsTable dateRange={dateRange} selectedCompany={selectedCompany} />
        </motion.div>

        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2026 车企销量数据分析平台 | 数据更新时间: {new Date().toLocaleDateString()}
          </p>
        </div>
      </motion.div>
    </div>
  );
}