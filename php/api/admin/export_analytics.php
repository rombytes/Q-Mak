<?php
/**
 * Export Analytics Report to Excel
 * Generates a comprehensive .xlsx report based on selected filters
 */

require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/session_config.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Font;

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    die('Unauthorized. Please login.');
}

try {
    $db = getDB();
    
    // Get filter parameters
    $period = $_GET['period'] ?? 'daily';
    $startDate = $_GET['start'] ?? date('Y-m-d');
    $endDate = $_GET['end'] ?? date('Y-m-d');
    $college = $_GET['college'] ?? '';
    $program = $_GET['program'] ?? '';
    
    // Prepare date range
    $startDateTime = new DateTime($startDate);
    $endDateTime = new DateTime($endDate);
    $endDateTime->modify('+1 day');
    $endDateQuery = $endDateTime->format('Y-m-d');
    
    // Build WHERE clause for filters
    $whereConditions = ["created_at >= :startDate", "created_at < :endDate"];
    $params = [
        'startDate' => $startDate,
        'endDate' => $endDateQuery
    ];
    
    if (!empty($college)) {
        $whereConditions[] = "college = :college";
        $params['college'] = $college;
    }
    
    if (!empty($program)) {
        $whereConditions[] = "program = :program";
        $params['program'] = $program;
    }
    
    $whereClause = "WHERE " . implode(" AND ", $whereConditions);
    
    // ===================================
    // FETCH DATA
    // ===================================
    
    // 1. Summary Statistics
    $stmtSummary = $db->prepare("
        SELECT
            COUNT(*) as total_orders,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
            SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready_orders
        FROM orders
        $whereClause
    ");
    $stmtSummary->execute($params);
    $summary = $stmtSummary->fetch(PDO::FETCH_ASSOC);
    
    // 2. Status Breakdown
    $stmtStatus = $db->prepare("
        SELECT
            status,
            COUNT(*) as count
        FROM orders
        $whereClause
        GROUP BY status
        ORDER BY count DESC
    ");
    $stmtStatus->execute($params);
    $statusBreakdown = $stmtStatus->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. Top Items (split comma-separated items)
    $stmtAllItems = $db->prepare("
        SELECT item_name, quantity
        FROM orders
        $whereClause
    ");
    $stmtAllItems->execute($params);
    $allOrders = $stmtAllItems->fetchAll(PDO::FETCH_ASSOC);
    
    $itemCounts = [];
    foreach ($allOrders as $order) {
        $items = array_map('trim', explode(',', $order['item_name']));
        $quantity = intval($order['quantity']);
        
        foreach ($items as $item) {
            if (!empty($item)) {
                if (!isset($itemCounts[$item])) {
                    $itemCounts[$item] = 0;
                }
                $itemCounts[$item] += $quantity;
            }
        }
    }
    
    arsort($itemCounts);
    
    // 4. Timeline Data
    $groupFormat = '';
    $labelFormat = '';
    
    switch ($period) {
        case 'daily':
            $groupFormat = "DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')";
            $labelFormat = "DATE_FORMAT(created_at, '%h:00 %p')";
            break;
        case 'weekly':
            $groupFormat = "CONCAT(YEAR(created_at), '-', WEEK(created_at, 1))";
            $labelFormat = "CONCAT(DATE_FORMAT(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY), '%b %e'), ' - ', DATE_FORMAT(DATE_ADD(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY), INTERVAL 6 DAY), '%b %e'))";
            break;
        case 'monthly':
            $groupFormat = "DATE_FORMAT(created_at, '%Y-%m')";
            $labelFormat = "DATE_FORMAT(created_at, '%b %Y')";
            break;
        case 'yearly':
            $groupFormat = "YEAR(created_at)";
            $labelFormat = "YEAR(created_at)";
            break;
        default:
            $groupFormat = "DATE_FORMAT(created_at, '%Y-%m-%d')";
            $labelFormat = "DATE_FORMAT(created_at, '%b %d')";
    }
    
    $stmtTimeline = $db->prepare("
        SELECT
            $labelFormat as label,
            COUNT(*) as total_orders,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders
        FROM orders
        $whereClause
        GROUP BY $groupFormat
        ORDER BY $groupFormat ASC
    ");
    $stmtTimeline->execute($params);
    $timeline = $stmtTimeline->fetchAll(PDO::FETCH_ASSOC);
    
    // ===================================
    // CREATE EXCEL FILE
    // ===================================
    
    $spreadsheet = new Spreadsheet();
    $spreadsheet->getProperties()
        ->setCreator('Q-Mak System')
        ->setTitle('Analytics Report')
        ->setSubject('Order Analytics')
        ->setDescription('Comprehensive analytics report for Q-Mak orders');
    
    // ===================================
    // SHEET 1: DASHBOARD SUMMARY
    // ===================================
    $sheet1 = $spreadsheet->getActiveSheet();
    $sheet1->setTitle('Dashboard Summary');
    
    // Title
    $sheet1->setCellValue('A1', 'Q-Mak Analytics Report');
    $sheet1->mergeCells('A1:D1');
    $sheet1->getStyle('A1')->applyFromArray([
        'font' => ['bold' => true, 'size' => 18, 'color' => ['rgb' => '1E3A8A']],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
    ]);
    
    // Date Range
    $dateRangeText = date('M d, Y', strtotime($startDate)) . ' - ' . date('M d, Y', strtotime($endDate));
    $sheet1->setCellValue('A2', 'Period: ' . $dateRangeText);
    $sheet1->mergeCells('A2:D2');
    $sheet1->getStyle('A2')->applyFromArray([
        'font' => ['italic' => true, 'size' => 12],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
    ]);
    
    // Applied Filters
    $row = 3;
    if (!empty($college) || !empty($program)) {
        $filters = [];
        if (!empty($college)) $filters[] = "College: $college";
        if (!empty($program)) $filters[] = "Program: $program";
        $sheet1->setCellValue('A' . $row, 'Filters: ' . implode(', ', $filters));
        $sheet1->mergeCells('A' . $row . ':D' . $row);
        $sheet1->getStyle('A' . $row)->applyFromArray([
            'font' => ['italic' => true, 'size' => 10, 'color' => ['rgb' => '6B7280']]
        ]);
        $row++;
    }
    
    $row++; // Blank row
    
    // KPI Summary Header
    $sheet1->setCellValue('A' . $row, 'KEY METRICS');
    $sheet1->mergeCells('A' . $row . ':B' . $row);
    $sheet1->getStyle('A' . $row)->applyFromArray([
        'font' => ['bold' => true, 'size' => 14],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DBEAFE']],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT]
    ]);
    $row++;
    
    // KPI Data
    $kpis = [
        ['Total Orders', $summary['total_orders']],
        ['Completed', $summary['completed_orders']],
        ['Pending', $summary['pending_orders']],
        ['Ready for Pickup', $summary['ready_orders']],
        ['Cancelled', $summary['cancelled_orders']]
    ];
    
    foreach ($kpis as $kpi) {
        $sheet1->setCellValue('A' . $row, $kpi[0]);
        $sheet1->setCellValue('B' . $row, $kpi[1]);
        $sheet1->getStyle('A' . $row . ':B' . $row)->applyFromArray([
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E7EB']]
            ]
        ]);
        $row++;
    }
    
    $row += 2; // Blank rows
    
    // Status Breakdown Header
    $sheet1->setCellValue('A' . $row, 'ORDER STATUS BREAKDOWN');
    $sheet1->mergeCells('A' . $row . ':B' . $row);
    $sheet1->getStyle('A' . $row)->applyFromArray([
        'font' => ['bold' => true, 'size' => 14],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DBEAFE']]
    ]);
    $row++;
    
    // Status Breakdown Table Header
    $sheet1->setCellValue('A' . $row, 'Status');
    $sheet1->setCellValue('B' . $row, 'Count');
    $sheet1->getStyle('A' . $row . ':B' . $row)->applyFromArray([
        'font' => ['bold' => true],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F3F4F6']],
        'borders' => [
            'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D1D5DB']]
        ]
    ]);
    $row++;
    
    // Status Breakdown Data
    foreach ($statusBreakdown as $status) {
        $sheet1->setCellValue('A' . $row, ucfirst($status['status']));
        $sheet1->setCellValue('B' . $row, $status['count']);
        $sheet1->getStyle('A' . $row . ':B' . $row)->applyFromArray([
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E7EB']]
            ]
        ]);
        $row++;
    }
    
    // Auto-size columns
    $sheet1->getColumnDimension('A')->setWidth(25);
    $sheet1->getColumnDimension('B')->setWidth(15);
    
    // ===================================
    // SHEET 2: TOP ITEMS
    // ===================================
    $sheet2 = $spreadsheet->createSheet();
    $sheet2->setTitle('Top Items');
    
    // Header
    $sheet2->setCellValue('A1', 'TOP ORDERED ITEMS');
    $sheet2->mergeCells('A1:C1');
    $sheet2->getStyle('A1')->applyFromArray([
        'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => '1E3A8A']],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
    ]);
    
    // Table Header
    $sheet2->setCellValue('A3', 'Rank');
    $sheet2->setCellValue('B3', 'Item Name');
    $sheet2->setCellValue('C3', 'Quantity Sold');
    $sheet2->getStyle('A3:C3')->applyFromArray([
        'font' => ['bold' => true],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DBEAFE']],
        'borders' => [
            'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D1D5DB']]
        ],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
    ]);
    
    // Top Items Data
    $rank = 1;
    $row = 4;
    foreach ($itemCounts as $item => $count) {
        $sheet2->setCellValue('A' . $row, $rank);
        $sheet2->setCellValue('B' . $row, $item);
        $sheet2->setCellValue('C' . $row, $count);
        $sheet2->getStyle('A' . $row . ':C' . $row)->applyFromArray([
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E7EB']]
            ]
        ]);
        
        // Highlight top 3
        if ($rank <= 3) {
            $sheet2->getStyle('A' . $row . ':C' . $row)->applyFromArray([
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FEF3C7']]
            ]);
        }
        
        $rank++;
        $row++;
    }
    
    // Auto-size columns
    $sheet2->getColumnDimension('A')->setWidth(8);
    $sheet2->getColumnDimension('B')->setWidth(40);
    $sheet2->getColumnDimension('C')->setWidth(18);
    
    // ===================================
    // SHEET 3: TIMELINE DATA
    // ===================================
    $sheet3 = $spreadsheet->createSheet();
    $sheet3->setTitle('Timeline Data');
    
    // Header
    $sheet3->setCellValue('A1', 'ORDER TIMELINE');
    $sheet3->mergeCells('A1:C1');
    $sheet3->getStyle('A1')->applyFromArray([
        'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => '1E3A8A']],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
    ]);
    
    $sheet3->setCellValue('A2', 'Period: ' . ucfirst($period));
    $sheet3->mergeCells('A2:C2');
    $sheet3->getStyle('A2')->applyFromArray([
        'font' => ['italic' => true, 'size' => 11],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
    ]);
    
    // Table Header
    $sheet3->setCellValue('A4', 'Period');
    $sheet3->setCellValue('B4', 'Total Orders');
    $sheet3->setCellValue('C4', 'Completed Orders');
    $sheet3->getStyle('A4:C4')->applyFromArray([
        'font' => ['bold' => true],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DBEAFE']],
        'borders' => [
            'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D1D5DB']]
        ],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
    ]);
    
    // Timeline Data
    $row = 5;
    foreach ($timeline as $data) {
        $sheet3->setCellValue('A' . $row, $data['label']);
        $sheet3->setCellValue('B' . $row, $data['total_orders']);
        $sheet3->setCellValue('C' . $row, $data['completed_orders']);
        $sheet3->getStyle('A' . $row . ':C' . $row)->applyFromArray([
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E7EB']]
            ]
        ]);
        $row++;
    }
    
    // Auto-size columns
    $sheet3->getColumnDimension('A')->setWidth(25);
    $sheet3->getColumnDimension('B')->setWidth(18);
    $sheet3->getColumnDimension('C')->setWidth(20);
    
    // ===================================
    // OUTPUT EXCEL FILE
    // ===================================
    
    // Set active sheet back to first sheet
    $spreadsheet->setActiveSheetIndex(0);
    
    // Prepare filename
    $filename = 'QMak_Analytics_' . date('Y-m-d', strtotime($startDate)) . '_to_' . date('Y-m-d', strtotime($endDate)) . '.xlsx';
    
    // Set headers for download
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment;filename="' . $filename . '"');
    header('Cache-Control: max-age=0');
    header('Cache-Control: max-age=1');
    header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s') . ' GMT');
    header('Cache-Control: cache, must-revalidate');
    header('Pragma: public');
    
    // Write to output
    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    
} catch (Exception $e) {
    error_log("Export Analytics Error: " . $e->getMessage());
    http_response_code(500);
    die('Error generating report: ' . $e->getMessage());
}
