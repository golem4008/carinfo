import React, { useState } from 'react';
import { toast } from 'sonner';
import { MonthlySalesData, BrandMonthlySales } from '../types';

interface FileUploaderProps {
  onDataLoaded: (monthlySalesData: MonthlySalesData[], brandMonthlySalesData: BrandMonthlySales[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onDataLoaded }) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // 解析CSV文件内容
  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    const results: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(value => value.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      results.push(row);
    }

    return results;
  };

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.endsWith('.csv')) {
      toast.error('请上传CSV格式的文件');
      return;
    }

    setIsUploading(true);
    setUploadedFileName(file.name);
    toast.info(`正在上传文件: ${file.name}`);

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const data = parseCSV(csvText);
        
        // 根据CSV数据构建应用所需的数据结构
        const monthlySalesData = processMonthlySalesData(data);
        const brandMonthlySalesData = processBrandMonthlySalesData(data);
        
        // 将解析后的数据传递给父组件
        onDataLoaded(monthlySalesData, brandMonthlySalesData);
        
        toast.success('数据上传成功');
      } catch (error) {
        toast.error('文件解析失败，请检查文件格式是否正确');
        console.error('文件解析错误:', error);
      } finally {
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      toast.error('文件读取失败');
      setIsUploading(false);
    };
    
    reader.readAsText(file);
  };

  // 处理月度销量数据
  const processMonthlySalesData = (csvData: any[]): MonthlySalesData[] => {
    // 现在CSV文件包含了厂商、品牌、型号、车辆类型、能源类型、销量、最低价格、最高价格等字段
    return csvData
      .filter(row => row['销量'] && row['厂商'] && row['月份'])
      .map(row => ({
        month: row['月份'],
        sales: parseInt(row['销量']) || 0,
        company: row['厂商'],
        year: parseInt(row['年份']) || 2025
      }));
  };

  // 处理品牌月度销量数据
  const processBrandMonthlySalesData = (csvData: any[]): BrandMonthlySales[] => {
    // 现在CSV文件包含了厂商、品牌、型号、车辆类型、能源类型、销量、最低价格、最高价格等字段
    return csvData
      .filter(row => row['销量'] && row['品牌'] && row['厂商'] && row['月份'])
      .map(row => ({
        brand: row['品牌'] || row['厂商'],
        manufacturer: row['厂商'],
        month: row['月份'],
        sales: parseInt(row['销量']) || 0,
        year: parseInt(row['年份']) || 2025
      }));
  };

  // 重置上传状态
  const handleReset = () => {
    setUploadedFileName('');
    // 创建一个新的文件输入元素来清除选择
    const input = document.getElementById('csv-upload') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          const input = document.getElementById('csv-upload') as HTMLInputElement;
          if (input) input.click();
        }}
        className={`w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
        disabled={isUploading}
      >
        {isUploading ? (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i>正在上传...
          </span>
        ) : uploadedFileName ? (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <i className="fa-solid fa-file-csv mr-2"></i>{uploadedFileName}
          </span>
        ) : (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <i className="fa-solid fa-upload mr-2"></i>上传CSV数据文件
          </span>
        )}
        {uploadedFileName && !isUploading && (
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-red-500 transition-colors"
            aria-label="移除文件"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        )}
      </button>
      <input
        id="csv-upload"
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
        disabled={isUploading}
      />
      
      {/* 文件格式说明 */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 max-w-md">
        <p className="mb-1"><i className="fa-solid fa-circle-info mr-1"></i>CSV文件格式说明：</p>
        <p className="ml-4">- 必须包含的字段：厂商, 品牌, 型号, 车辆类型, 能源类型, 销量, 最低价格, 最高价格</p>
        <p className="ml-4">- 示例：特斯拉,特斯拉,Model 3,轿车,纯电,8000,21.99,25.99</p>
      </div>
    </div>
  );
};

export default FileUploader;