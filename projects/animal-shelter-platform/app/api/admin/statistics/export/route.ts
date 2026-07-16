import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import {
  formatDateInputValue,
  getAdminStatistics
} from "@/lib/services/statistics.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requirePermission("statistics.view");

  const url = new URL(request.url);
  const searchInput = Object.fromEntries(url.searchParams.entries());
  const { filters, snapshot } = await getAdminStatistics(searchInput);
  const workbook = new ExcelJS.Workbook();
  const period = `${formatDateInputValue(filters.from)} - ${formatDateInputValue(filters.to)}`;

  workbook.creator = "Animal Shelter Admin";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = "Статистика заявок приюта";
  workbook.title = "Статистика заявок";

  const reportSheet = workbook.addWorksheet("Отчет");
  buildReportSheet(reportSheet, {
    generatedAt: new Date(),
    period,
    snapshot
  });

  const citySheet = workbook.addWorksheet("По городам");
  citySheet.columns = [
    { header: "Город", key: "city", width: 26 },
    { header: "Всего заявок", key: "total", width: 16 },
    { header: "Одобрено", key: "approved", width: 14 },
    { header: "Отклонено", key: "rejected", width: 14 },
    { header: "Процент одобрения", key: "conversion", width: 20 }
  ];
  citySheet.addRows(snapshot.topCities.map((city) => ({
    ...city,
    conversion: city.total ? `${Math.round((city.approved / city.total) * 100)}%` : "0%"
  })));

  const speciesSheet = workbook.addWorksheet("Животные по городам");
  speciesSheet.columns = [
    { header: "Город", key: "city", width: 26 },
    { header: "Всего", key: "total", width: 12 },
    { header: "Собаки", key: "dogs", width: 12 },
    { header: "Кошки", key: "cats", width: 12 },
    { header: "Без животного", key: "other", width: 16 }
  ];
  speciesSheet.addRows(snapshot.speciesByCity);

  const trendSheet = workbook.addWorksheet("Динамика");
  trendSheet.columns = [
    { header: "Дата", key: "date", width: 16 },
    { header: "Всего", key: "total", width: 12 },
    { header: "Одобрено", key: "approved", width: 12 },
    { header: "Отклонено", key: "rejected", width: 12 }
  ];
  trendSheet.addRows(snapshot.trendByDate);

  for (const sheet of workbook.worksheets) {
    styleWorksheet(sheet);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `animal-shelter-statistics-${formatDateInputValue(filters.from)}-${formatDateInputValue(filters.to)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  });
}

function buildReportSheet(
  sheet: ExcelJS.Worksheet,
  {
    generatedAt,
    period,
    snapshot
  }: {
    generatedAt: Date;
    period: string;
    snapshot: Awaited<ReturnType<typeof getAdminStatistics>>["snapshot"];
  }
) {
  sheet.columns = [
    { key: "a", width: 28 },
    { key: "b", width: 16 },
    { key: "c", width: 16 },
    { key: "d", width: 16 },
    { key: "e", width: 20 }
  ];

  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = "Отчет по заявкам приюта";
  sheet.getCell("A1").font = { bold: true, size: 16 };
  sheet.getCell("A1").alignment = { horizontal: "center" };

  sheet.getCell("A3").value = "Период";
  sheet.getCell("B3").value = period;
  sheet.getCell("A4").value = "Дата генерации";
  sheet.getCell("B4").value = generatedAt.toLocaleString("ru-RU");

  const summaryRows = [
    ["Всего заявок", snapshot.summary.totalApplications],
    ["Новые заявки", snapshot.summary.newApplications],
    ["Одобренные заявки", snapshot.summary.approvedApplications],
    ["Отклоненные заявки", snapshot.summary.rejectedApplications],
    ["Закрытые заявки", snapshot.summary.closedApplications],
    ["Конверсия одобрения", `${snapshot.conversionRate}%`]
  ];

  sheet.getCell("A6").value = "Сводка";
  sheet.getCell("A6").font = { bold: true, size: 13 };

  summaryRows.forEach(([label, value], index) => {
    const row = sheet.getRow(7 + index);
    row.getCell(1).value = label;
    row.getCell(2).value = value;
  });

  const cityHeaderRowNumber = 15;
  sheet.getCell(`A${cityHeaderRowNumber - 1}`).value = "Города";
  sheet.getCell(`A${cityHeaderRowNumber - 1}`).font = { bold: true, size: 13 };
  sheet.getRow(cityHeaderRowNumber).values = [
    "Город",
    "Всего заявок",
    "Одобрено",
    "Отклонено",
    "Процент одобрения"
  ];

  snapshot.topCities.forEach((city, index) => {
    const row = sheet.getRow(cityHeaderRowNumber + 1 + index);
    row.values = [
      city.city,
      city.total,
      city.approved,
      city.rejected,
      city.total ? `${Math.round((city.approved / city.total) * 100)}%` : "0%"
    ];
  });

  sheet.getRow(cityHeaderRowNumber).font = { bold: true };
  sheet.getRow(cityHeaderRowNumber).fill = {
    fgColor: { argb: "FFE8DFD4" },
    pattern: "solid",
    type: "pattern"
  };
  sheet.autoFilter = {
    from: { column: 1, row: cityHeaderRowNumber },
    to: { column: 5, row: cityHeaderRowNumber }
  };
  sheet.views = [{ state: "frozen", ySplit: cityHeaderRowNumber }];

  for (let rowNumber = 3; rowNumber <= 12; rowNumber += 1) {
    sheet.getRow(rowNumber).getCell(1).font = { bold: true };
  }
}

function styleWorksheet(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);

  if (headerRow.cellCount > 0 && sheet.name !== "Отчет") {
    headerRow.font = { bold: true };
    headerRow.fill = {
      fgColor: { argb: "FFE8DFD4" },
      pattern: "solid",
      type: "pattern"
    };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
  }

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        bottom: { color: { argb: "FFE8DFD4" }, style: "thin" }
      };
    });
  });
}
