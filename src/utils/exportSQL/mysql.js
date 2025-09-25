import { escapeQuotes, parseDefault } from "./shared";

import { dbToTypes } from "../../data/datatypes";
import { DB } from "../../data/constants";

function parseType(field) {
  let res = field.type;

  if (field.type === "SET" || field.type === "ENUM") {
    res += `${field.values ? "(" + field.values.map((value) => "'" + value + "'").join(", ") + ")" : ""}`;
  }

  if (dbToTypes[DB.MYSQL][field.type].isSized) {
    res += `${field.size && field.size !== "" ? "(" + field.size + ")" : ""}`;
  }

  return res;
}

export function toMySQL(diagram) {
  return `${diagram.tables
    .map(
      (table) =>
        `CREATE TABLE \`${table.name}\` \n(\n${table.fields
          .map(
            (field) =>
              `\t\`${field.name}\` ${parseType(field)}${field.unsigned ? " UNSIGNED" : ""}${
                field.notNull ? " NOT NULL" : " NULL"
              }${
                field.increment ? " AUTO_INCREMENT" : ""
              }${field.unique ? " UNIQUE" : ""}${
                field.default !== ""
                  ? ` DEFAULT ${parseDefault(field, diagram.database)}`
                  : ""
              }${
                field.check === "" ||
                !dbToTypes[diagram.database][field.type].hasCheck
                  ? ""
                  : ` CHECK(${field.check})`
              }${field.comment ? ` COMMENT '${escapeQuotes(field.comment)}'` : ""}`,
          )
          .join(",\n")}${table.indices
            .map(
              (i) =>
                `,\n\t${i.unique ? "UNIQUE " : ""}INDEX \`${ i.name }\` (${i.fields
                  .map((f) => `\`${f}\``)
                  .join(", ")})`,
            )
            .join("")}${
          table.fields.filter((f) => f.primary).length > 0
            ? `,\n\tPRIMARY KEY(${table.fields
                .filter((f) => f.primary)
                .map((f) => `\`${f.name}\``)
                .join(", ")})`
            : ""
        }\n)${table.engine ? ` ENGINE = ${escapeQuotes(table.engine)}` : `ENGINE = InnoDB`} \n${table.charset ? `  DEFAULT CHARSET = ${escapeQuotes(table.charset)}` : `  DEFAULT CHARSET = utf8`} ${table.comment ? ` COMMENT='${escapeQuotes(table.comment)}'` : ""};\n`,
    )
    .join("\n")}\n${diagram.references?`# 外键关系按实际需要来执行，用于构建图关系\n`:``}${diagram.references
    .map((r) => {
      const { name: startName, fields: startFields } = diagram.tables.find(
        (t) => t.id === r.startTableId,
      );

      const { name: endName, fields: endFields } = diagram.tables.find(
        (t) => t.id === r.endTableId,
      );
      return `ALTER TABLE \`${startName}\`\nADD FOREIGN KEY(\`${
        startFields.find((f) => f.id === r.startFieldId).name
      }\`) REFERENCES \`${endName}\`(\`${
        endFields.find((f) => f.id === r.endFieldId).name
      }\`)\nON UPDATE ${r.updateConstraint.toUpperCase()} ON DELETE ${r.deleteConstraint.toUpperCase()};`;
    })
    .join("\n")}`;
}
