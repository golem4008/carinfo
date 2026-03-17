import React, { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { motion } from 'framer-motion';
import { getMarketShareData, getCurrentMonthlySalesData, formatMonthWithYear, carCompanies } from '../mocks/data';
import { manufacturerCategories, isMainstreamManufacturer } from '../mocks/manufacturerCategories';
import CarCompanySelector from './CarCompanySelector';
import { CarCompany, DateRange } from '../types';

interface MarketShareChartProps {
  className?: string;
  dateRange?: DateRange;
}

const MarketShareChart: React.FC<MarketShareChartProps> = ({ className = '', dateRange }) => {
  const [selectedCompanies, setSelectedCompanies] = useState<CarCompany[]>(carCompanies);
  const [pieChartData, setPieChartData] = useState<any[]>([]);
  const [barChartData, setBarChartData] = useState<any[]>([]);
  // 新增：传统厂商和新势力厂商的市占率变化趋势数据
  const [traditionalMarketShareData, setTraditionalMarketShareData] = useState<any[]>([]);
  const [newEnergyMarketShareData, setNewEnergyMarketShareData] = useState<any[]>([]);
  // 追踪当前悬停的车企
  const [hoveredCompany, setHoveredCompany] = useState<string | null>(null);
  
  // 当选中的车企变化或日期范围变化时，更新图表数据
  useEffect(() => {
    if (selectedCompanies.length === 0) return;

    // 更新圆饼图数据（总销量市场份额）
    updatePieChartData();
    
    // 更新柱状图数据（月度销量市场份额）
    updateBarChartData();
    
    // 更新折线图数据（传统厂商和新势力厂商市占率变化趋势）
    updateLineChartData();
  }, [selectedCompanies, dateRange]);

  // 更新圆饼图数据
  const updatePieChartData = () => {
    // 获取市场份额数据
    const marketShare = getMarketShareData(dateRange);
    
    // 分离主流厂商和非主流厂商数据
    const mainstreamData: any[] = [];
    let otherManufacturerShare = 0;
    let otherManufacturerSales = 0;
    
    marketShare.forEach(item => {
      if (selectedCompanies.some(company => company.name === item.company)) {
        // 对于选中的公司，直接添加
        mainstreamData.push(item);
      } else if (!isMainstreamManufacturer(item.company)) {
        // 对于非选中的非主流厂商，合并到"其他厂商"
        otherManufacturerShare += item.share;
        otherManufacturerSales += item.sales;
      }
    });
    
    // 如果有非主流厂商数据，添加"其他厂商"项
    if (otherManufacturerShare > 0) {
      mainstreamData.push({
        company: '其他厂商',
        share: parseFloat(otherManufacturerShare.toFixed(1)),
        sales: otherManufacturerSales,
        color: '#8884d8' // 为"其他厂商"设置默认颜色
      });
    }
    
    // 按市场份额降序排列
    mainstreamData.sort((a, b) => b.share - a.share);
    
    setPieChartData(mainstreamData);
  };

  // 更新柱状图数据（月度市场份额）
  const updateBarChartData = () => {
    // 获取月度销量数据
    const monthlySalesData = getCurrentMonthlySalesData(dateRange);
    
    // 获取数据中的所有月份和年份组合
    const monthYearPairs = Array.from(new Set(monthlySalesData.map(item => `${item.year}-${item.month}`)))
      .sort((a, b) => {
        const [yearA, monthA] = a.split('-');
        const [yearB, monthB] = b.split('-');
        if (parseInt(yearA) !== parseInt(yearB)) {
          return parseInt(yearA) - parseInt(yearB);
        }
        return parseInt(monthA) - parseInt(monthB);
      });
    
    // 对于每个月，计算各车企的市场份额
    const monthlyMarketShare = monthYearPairs.map(monthYear => {
      const [year, month] = monthYear.split('-');
      // 获取当前月的所有销量数据
      const monthSalesData = monthlySalesData.filter(item => item.month === month && item.year === parseInt(year));
      
      // 计算当前月的总销量
      const monthTotalSales = monthSalesData.reduce((sum, item) => sum + item.sales, 0);
      
      // 使用从月份年份组合中提取的年份
      const currentYear = parseInt(year);
      
      // 构建当前月的数据对象
      const monthData: any = {
        month: formatMonthWithYear(month, currentYear),
        year: currentYear
      };
      
      // 计算每个所选车企的市场份额
      selectedCompanies.forEach(company => {
        const companySales = monthSalesData.find(item => item.company === company.name)?.sales || 0;
        const share = monthTotalSales > 0 ? (companySales / monthTotalSales) * 100 : 0;
        monthData[company.name] = parseFloat(share.toFixed(1));
      });
      
      // 计算其他厂商的市场份额 - 只保留选中的主流厂商，其余所有非主流厂商数据合并到"其他厂商"
      let otherManufacturerSales = 0;
      monthSalesData.forEach(item => {
        if (!selectedCompanies.some(company => company.name === item.company) || !isMainstreamManufacturer(item.company)) {
          otherManufacturerSales += item.sales;
        }
      });
      
      if (otherManufacturerSales > 0) {
        const otherShare = monthTotalSales > 0 ? (otherManufacturerSales / monthTotalSales) * 100 : 0;
        monthData['其他厂商'] = parseFloat(otherShare.toFixed(1));
      }
      
      return monthData;
    });
    
    // 按年月排序
    monthlyMarketShare.sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      return a.month.localeCompare(b.month);
    });
    
    setBarChartData(monthlyMarketShare);
  };
  
  // 更新折线图数据（显示每个分类中各车企的市占率变化趋势）
  const updateLineChartData = () => {
    // 获取月度销量数据
    const monthlySalesData = getCurrentMonthlySalesData(dateRange);
    
    // 获取数据中的所有月份
	  const yearMonthPairs = Array.from(new Set(monthlySalesData.map(item => `${item.year}-${item.month}`)))
	    .sort((a, b) => {
	      // 按「年→月」排序，保证时间顺序正确
	      const [yearA, monthA] = a.split('-');
	      const [yearB, monthB] = b.split('-');
	      if (parseInt(yearA) !== parseInt(yearB)) {
	        return parseInt(yearA) - parseInt(yearB);
	      }
	      return parseInt(monthA) - parseInt(monthB);
	    });
    
    // 对于每个月，计算每个车企的市场份额
	  const monthlyCompanyShare = yearMonthPairs.map(yearMonth => {
	    const [year, month] = yearMonth.split('-');
	    // 筛选当前「年+月」的销量数据（精准匹配，不再跨年份）
	    const monthSalesData = monthlySalesData.filter(item => item.month === month && item.year === parseInt(year));
	    
	    // 计算当前月总销量
	    const monthTotalSales = monthSalesData.reduce((sum, item) => sum + item.sales, 0);
	    
	    // 构建当前「年+月」的数据对象（month字段带年份，避免重叠）
	    const monthData: any = {
	      month: formatMonthWithYear(month, parseInt(year)), // 如"2025.01"、"2026.01"
	      year: parseInt(year),
	      rawMonth: month, // 保留原始月份（可选，用于扩展）
	      rawYear: parseInt(year) // 保留原始年份（可选，用于扩展）
	    };
      
      // 为每个公司计算市场份额
      selectedCompanies.forEach(company => {
        const companySales = monthSalesData.find(item => item.company === company.name)?.sales || 0;
        const share = monthTotalSales > 0 ? (companySales / monthTotalSales) * 100 : 0;
        monthData[company.name] = parseFloat(share.toFixed(1));
      });
      
      return monthData;
    });
    
    // 按年月排序
    monthlyCompanyShare.sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      return a.month.localeCompare(b.month);
    });
    
    // 为两个折线图准备数据
    // 传统厂商市占率变化趋势数据 - 只包含传统厂商的车企
    const traditionalData = monthlyCompanyShare.map(item => {
      const monthData: any = { month: item.month };
      selectedCompanies
        .filter(company => manufacturerCategories.traditional.includes(company.name))
        .forEach(company => {
          monthData[company.name] = item[company.name] || 0;
        });
      return monthData;
    });
    
    // 新势力厂商市占率变化趋势数据 - 只包含新势力厂商的车企
    const newEnergyData = monthlyCompanyShare.map(item => {
      const monthData: any = { month: item.month };
      selectedCompanies
        .filter(company => manufacturerCategories.newEnergy.includes(company.name))
        .forEach(company => {
          monthData[company.name] = item[company.name] || 0;
        });
      return monthData;
    });
    
    setTraditionalMarketShareData(traditionalData);
    setNewEnergyMarketShareData(newEnergyData);
  };

  // 处理柱状图的鼠标进入事件
  const handleBarMouseEnter = (companyName: string) => {
    setHoveredCompany(companyName);
  };

  // 处理柱状图的鼠标离开事件
  const handleBarMouseLeave = () => {
    setHoveredCompany(null);
  };

  // 处理图表的鼠标离开事件
  const handleChartMouseLeave = () => {
    setHoveredCompany(null);
  };

  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 自定义圆饼图Tooltip
  const PieCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.company}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">市场份额:</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{data.share}%</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">总销量:</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(data.sales)} 辆</p>
        </div>
      );
    }
    return null;
  };

  // 自定义柱状图Tooltip
  const BarCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // 计算当前月份的总销量，用于计算实际销量
      let totalSalesForMonth = 0;
      
      // 遍历payload获取所有值的总和（百分比总和应该约等于100%）
      payload.forEach((entry: any) => {
        totalSalesForMonth += entry.value;
      });
      
      // 获取当前月份的实际总销量（从月度销售数据中查找）
      const monthlySalesData = getCurrentMonthlySalesData(dateRange);
      const [year, month] = label.split('.');
      const monthStr = `${parseInt(month)}月`;
      const actualMonthlySales = monthlySalesData
        .filter(item => item.month === monthStr && item.year === parseInt(year))
        .reduce((sum, item) => sum + item.sales, 0);
      
      // 将payload数据分为多列，每列10个
      const columnCount = Math.ceil(payload.length / 10);
      const columns: any[][] = [];
      
      for (let i = 0; i < columnCount; i++) {
        columns[i] = payload.slice(i * 10, (i + 1) * 10);
      }
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">总销量: {formatNumber(actualMonthlySales)} 辆</p>
          
          {/* 使用grid布局创建多列显示 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {columns.map((column, columnIndex) => (
              <div key={columnIndex}>
                {column.map((entry: any, index: number) => {
                  // 检查当前条目是否是悬停的车企
                  const isHovered = hoveredCompany && entry.name === hoveredCompany;
                  
                  // 计算实际销量
                  const actualSales = Math.round((entry.value / 100) * actualMonthlySales);
                  
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
                        {entry.value}% ({formatNumber(actualSales)} 辆)
                      </span>
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };
  
   // 自定义折线图Tooltip
  const LineCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: any, index: number) => {
            // 检查当前条目是否是悬停的车企
            const isHovered = hoveredCompany && entry.name === hoveredCompany;
            
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
                  {entry.value}%
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

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 ${className}`}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">市场份额分析</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            分析所选车企的总销量市场份额及月度变化趋势
          </p>
        </div>
        <CarCompanySelector 
          onCompanyChange={setSelectedCompanies} 
          initialSelectedCompanies={selectedCompanies}
        />
      </div>
      
      {/* 圆饼图 - 总销量市场份额 */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">总销量市场份额</h4>
       <div className="h-[400px]">
           {pieChartData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                   labelLine={true}
                   outerRadius={120}
                   fill="#8884d8"
                   dataKey="share"
                   animationDuration={1500}
                   animationBegin={200}
                   label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }) => {
                     // 使用payload中的原始数据
                     const companyData = payload || pieChartData[index];
                     if (!companyData) return null;
                     
                     const name = companyData.company || '未知厂商';
                     const percentage = `${(percent * 100).toFixed(1)}%`;
                     // 确保使用正确的销量数据
                     const sales = companyData.sales > 0 ? formatNumber(companyData.sales) : '0';
                     
                     // 计算标签位置，避免重叠
                     const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                     const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                     const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                     
                     return (
                       <text
                         x={x}
                         y={y}
                         fill="#333"
                         textAnchor={x > cx ? 'start' : 'end'}
                         dominantBaseline="central"
                         fontSize={12}
                         fontWeight="500"
                         className="whitespace-nowrap"
                       >
                         {`${name}: ${percentage} (${sales}辆)`}
                       </text>
                     );
                   }}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
      <Tooltip 
        content={<PieCustomTooltip />} 
         contentStyle={{ pointerEvents: 'none' }}
        offset={100} // 调整偏移量值为100
        position={(point) => ({ 
          x: point.x > window.innerWidth / 2 ? point.x - 200 : point.x + 30, // 调整x轴偏移
          y: point.y > window.innerHeight / 2 ? point.y - 100 : point.y + 30 // 调整y轴偏移
        })}
      />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">请选择车企查看市场份额数据</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 叠放柱状图 - 月度销量市场份额（改为横轴为月份） */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">月度销量市场份额</h4>
        <div className="h-[700px]">
          {barChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                onMouseLeave={handleChartMouseLeave}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  type="category" 
                  dataKey="month"
                  tick={{ fill: '#6b7280' }} 
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => value}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  type="number"
                  tick={{ fill: '#6b7280' }} 
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `${value}%`}
                />
                  <Tooltip 
                    content={<BarCustomTooltip />} 
                     contentStyle={{ pointerEvents: 'none' }}
                    offset={100}
                  />
                <Legend 
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={(value) => <span className={`text-sm ${hoveredCompany === value ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{value}</span>}
                />
                {carCompanies.map((company) => {
  // 检查公司是否被选中且为主流厂商
  const isSelected = selectedCompanies.some(selected => selected.id === company.id) && isMainstreamManufacturer(company.name);
  // 只有选中的主流公司才会显示数据
  if (!isSelected) return null;
  
  return (
    <Bar 
      key={company.id} 
      dataKey={company.name} 
      fill={company.color}
      stackId="a"
      radius={[4, 4, 0, 0]}
      animationDuration={1500}
      // 添加鼠标事件处理器
      onMouseEnter={() => handleBarMouseEnter(company.name)}
      onMouseLeave={handleBarMouseLeave}
      style={{ 
        opacity: hoveredCompany ? (hoveredCompany === company.name ? 1 : 0.6) : 1,
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer'  // 添加指针样式，提升用户体验
      }}
    />
  );
})}

    {/* 添加"其他厂商"柱状图数据 */}
    {barChartData.some(item => item['其他厂商'] !== undefined) && (
      <Bar 
        dataKey="其他厂商" 
        fill="#8884d8"
        stackId="a"
        radius={[4, 4, 0, 0]}
        animationDuration={1500}
        onMouseEnter={() => handleBarMouseEnter('其他厂商')}
        onMouseLeave={handleBarMouseLeave}
        style={{ 
          opacity: hoveredCompany ? (hoveredCompany === '其他厂商' ? 1 : 0.6) : 1,
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer'
        }}
      />
    )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">请选择车企查看月度市场份额数据</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 新增：传统厂商市占率变化趋势折线图 */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">传统厂商市占率变化趋势</h4>
        <div className="h-[500px]">
          {traditionalMarketShareData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
             <LineChart
                data={traditionalMarketShareData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                onMouseLeave={handleChartMouseLeave}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month"
                  tick={{ fill: '#6b7280' }} 
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => value}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fill: '#6b7280' }} 
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `${value}%`}
                />
                  <Tooltip 
                    content={<LineCustomTooltip />} 
                     contentStyle={{ pointerEvents: 'none' }}
                    offset={100}
                  />
                <Legend 
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={(value) => <span className={`text-sm ${hoveredCompany === value ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{value}</span>}
                />
                  {carCompanies
                    .filter(company => manufacturerCategories.traditional.includes(company.name))
                    .filter(company => selectedCompanies.some(selected => selected.id === company.id))
                    .map((company) => (
                      <Line 
                        key={company.id}
                        type="monotone" 
                        dataKey={company.name} 
                        stroke={company.color}
                        strokeWidth={hoveredCompany === company.name ? 4 : 2}
                        dot={{ 
                          fill: company.color, 
                          r: hoveredCompany === company.name ? 6 : 4,
                          stroke: hoveredCompany === company.name ? company.color : 'none',
                          strokeWidth: 2
                        }}
                        activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                        animationDuration={1500}
                        onMouseEnter={() => handleBarMouseEnter(company.name)}
                        onMouseLeave={handleBarMouseLeave}
                        onMouseOver={() => handleBarMouseEnter(company.name)}
                        onMouseOut={handleBarMouseLeave}
                        style={{ 
                          opacity: hoveredCompany ? (hoveredCompany === company.name ? 1 : 0.4) : 1,
                          transition: 'all 0.2s ease-in-out',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">暂无传统厂商市占率数据</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 新增：新势力厂商市占率变化趋势折线图 */}
      <div>
        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">新势力厂商市占率变化趋势</h4>
        <div className="h-[500px]">
          {newEnergyMarketShareData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
             <LineChart
                data={newEnergyMarketShareData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                onMouseLeave={handleChartMouseLeave}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month"
                  tick={{ fill: '#6b7280' }} 
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => value}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fill: '#6b7280' }} 
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `${value}%`}
                />
                  <Tooltip 
                    content={<LineCustomTooltip />} 
                     contentStyle={{ pointerEvents: 'none' }}
                    offset={100}
                  />
                <Legend 
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={(value) => <span className={`text-sm ${hoveredCompany === value ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{value}</span>}
                />
                  {carCompanies
                    .filter(company => manufacturerCategories.newEnergy.includes(company.name))
                    .filter(company => selectedCompanies.some(selected => selected.id === company.id))
                    .map((company) => (
                      <Line 
                        key={company.id}
                        type="monotone" 
                        dataKey={company.name} 
                        stroke={company.color}
                        strokeWidth={hoveredCompany === company.name ? 4 : 2}
                        dot={{ 
                          fill: company.color, 
                          r: hoveredCompany === company.name ? 6 : 4,
                          stroke: hoveredCompany === company.name ? company.color : 'none',
                          strokeWidth: 2
                        }}
                        activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                        animationDuration={1500}
                        onMouseEnter={() => handleBarMouseEnter(company.name)}
                        onMouseLeave={handleBarMouseLeave}
                        onMouseOver={() => handleBarMouseEnter(company.name)}
                        onMouseOut={handleBarMouseLeave}
                        style={{ 
                          opacity: hoveredCompany ? (hoveredCompany === company.name ? 1 : 0.4) : 1,
                          transition: 'all 0.2s ease-in-out',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">暂无新势力厂商市占率数据</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MarketShareChart;