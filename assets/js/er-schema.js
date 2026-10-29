/* ================================================================
   er-schema.js · ER 模型检查 / 逻辑模式重构
   对外接口：
     ERSCHEMA.checks(model)        -> 检查项数组
     ERSCHEMA.build(model)         -> { tables, notes, warnings }
   ================================================================ */
window.ERSCHEMA = (function () {
  'use strict';
  const util = DDB.util;
  const ident = util.ident;

  /* ---------------- 类型推断 ---------------- */
  function guessType(name) {
    const n = String(name || '').toLowerCase().replace(/\s+/g, '');
    if (/^(id|.*_id|code|.*code|number|count|qty|quantity|age|credits?|year|score|rank|level|num|.*_num)$/.test(n)) return 'INT';
    if (/(price|amount|cost|salary|balance|rate|total|fee|grade|weight)/.test(n)) return 'DECIMAL(10,2)';
    if (/(timestamp|_at$|created|updated)/.test(n)) return 'TIMESTAMP';
    if (/(date|birth|day|_on$)/.test(n)) return 'DATE';
    if (/(^(is|has|can|should)_|flag|^(active|enabled|deleted|valid|available))/.test(n)) return 'BOOLEAN';
    if (/(email|name|title|address|city|street|phone|description|note|comment|content|text|summary|url|path)/.test(n)) return 'VARCHAR(255)';
    if (/(credits|credit)/.test(n)) return 'INT';
    return 'VARCHAR(255)';
  }
  function inferType(name, type) {
    if (type && type !== 'AUTO') return type;
    return guessType(name);
  }

  /* ---------------- 通用查找 ---------------- */
  function getEntity(model, id) { return model.entities.find(function (e) { return e.id === id; }); }
  function getRel(model, id) { return model.relationships.find(function (r) { return r.id === id; }); }
  function parentMap(model) {
    const map = {};
    model.isas.forEach(function (isa) {
      if (!isa.parentId) return;
      isa.childIds.forEach(function (cid) {
        if (!map[cid]) map[cid] = isa.parentId;
      });
    });
    return map;
  }
  function entityDepth(model, id, seen) {
    seen = seen || {};
    if (seen[id]) return 0;
    seen[id] = true;
    const pm = parentMap(model);
    const pid = pm[id];
    if (!pid || !getEntity(model, pid)) return 0;
    return 1 + entityDepth(model, pid, seen);
  }
  /** 找出弱实体的标识关系（指向强实体的 (1,1) 关系） */
  function findOwner(model, ent) {
    for (let i = 0; i < model.relationships.length; i += 1) {
      const rel = model.relationships[i];
      const mine = rel.participants.find(function (p) { return p.entityId === ent.id; });
      if (!mine || mine.max !== '1') continue;
      const others = rel.participants.filter(function (p) { return p.entityId !== ent.id; });
      if (others.length !== 1) continue;
      const owner = getEntity(model, others[0].entityId);
      if (!owner || owner.weak) continue;
      return { rel: rel, owner: owner };
    }
    return null;
  }

  /** 生成当前界面语言的一句话（检查提示/重构笔记用，避免碎片翻译） */
  function tr(zh, en, it) {
    const l = (document.documentElement.lang || 'zh').slice(0, 2);
    if (l === 'en') return en;
    if (l === 'it') return it;
    return zh;
  }

  /** 有效外键：引用的实体/属性存在且是被引用实体的主键，关系也存在 */
  function validFks(model, ent) {
    const out = [];
    (ent.fks || []).forEach(function (f) {
      const target = getEntity(model, f.refEntityId);
      if (!target) return;
      const ref = target.attributes.find(function (a) { return a.id === f.refAttrId; });
      if (!ref || !ref.key || ref.multi) return;
      const rel = getRel(model, f.relId);
      if (!rel) return;
      out.push({ fk: f, target: target, ref: ref, rel: rel });
    });
    return out;
  }

  /* ---------------- 检查 ---------------- */
  function checks(model) {
    const out = [];
    const err = function (msg, target) { out.push({ level: 'err', msg: msg, target: target }); };
    const warn = function (msg, target) { out.push({ level: 'warn', msg: msg, target: target }); };
    const info = function (msg, target) { out.push({ level: 'info', msg: msg, target: target }); };
    const pm = parentMap(model);
    const seenNames = {};
    const seenTableNames = {};

    if (!model.entities.length && !model.relationships.length) {
      info('模型还是空的，先从添加实体开始。');
      return out;
    }

    model.entities.forEach(function (ent) {
      const label = ent.name || '（未命名实体）';
      const target = { ntype: 'entity', id: ent.id };
      if (!ent.name || !ent.name.trim()) err('存在未命名的实体。', target);
      const lower = (ent.name || '').trim().toLowerCase();
      if (lower) {
        if (seenNames[lower]) err('实体名称重复：「' + ent.name + '」。', target);
        seenNames[lower] = true;
        if (seenTableNames[ident(ent.name).toLowerCase()]) warn('实体名称「' + ent.name + '」与其他元素生成同名的表。', target);
        seenTableNames[ident(ent.name).toLowerCase()] = true;
      }
      if (!ent.attributes.length) warn('实体「' + label + '」没有任何属性。', target);
      const attrNames = {};
      ent.attributes.forEach(function (a) {
        const al = (a.name || '').trim().toLowerCase();
        if (!al) warn('实体「' + label + '」存在未命名的属性。', target);
        else if (attrNames[al]) err('实体「' + label + '」中属性名重复：「' + a.name + '」。', target);
        else attrNames[al] = true;
      });
      const keyAttrs = ent.attributes.filter(function (a) { return a.key && !a.multi; });
      if (ent.weak) {
        if (!findOwner(model, ent)) {
          err('弱实体「' + label + '」缺少标识关系：应通过最大基数为 1 的关系连接到所有者（强）实体。', target);
        }
        if (!keyAttrs.length) warn('弱实体「' + label + '」没有设置部分键（部分键用于区分同一所有者下的实例）。', target);
      } else if (!pm[ent.id]) {
        const extFks = validFks(model, ent);
        if (!keyAttrs.length) {
          if (extFks.length) {
            const names = extFks.map(function (x) { return x.target.name + '.' + x.ref.name; }).join(', ');
            info(tr(
              '实体「' + label + '」没有自有主键属性，主键由外键（' + names + '）充当。',
              'Entity "' + label + '" has no key attribute of its own; its foreign key (' + names + ') acts as the primary key.',
              'L’entità "' + label + '" non ha attributi chiave propri; la chiave (' + names + ') identifica l’entità.'
            ), target);
          } else {
            err('实体「' + label + '」缺少主键（请勾选一个属性为「主键」）。', target);
          }
        } else if (keyAttrs.length > 1) {
          info('实体「' + label + '」使用复合主键（' + keyAttrs.map(function (a) { return a.name; }).join(', ') + '）。', target);
        }
      }
      ent.attributes.forEach(function (a) {
        if (a.multi) info('多值属性「' + label + '.' + a.name + '」在重构时会生成独立的表。', target);
        if (a.composite) info('复合属性「' + label + '.' + a.name + '」在重构时会展开为多列。', target);
        if (a.multi && a.composite) warn('属性「' + label + '.' + a.name + '」同时标记为多值与复合，重构时按多值处理。', target);
      });
      if (!model.relationships.some(function (r) {
        return r.participants.some(function (p) { return p.entityId === ent.id; });
      }) && ent.attributes.length > 1) {
        info('实体「' + label + '」没有参与任何关系，将成为独立的一张表。', target);
      }
    });

    model.relationships.forEach(function (rel) {
      const label = rel.name || '（未命名关系）';
      const target = { ntype: 'relationship', id: rel.id };
      if (!rel.name || !rel.name.trim()) err('存在未命名的关系。', target);
      if (!rel.participants.length) {
        err('关系「' + label + '」没有任何参与实体。', target);
        return;
      }
      if (rel.participants.length === 1) info('关系「' + label + '」是一元关系（只有一个参与端）。', target);
      const ids = {};
      rel.participants.forEach(function (p) {
        const ent = getEntity(model, p.entityId);
        if (!ent) { err('关系「' + label + '」引用了不存在的实体。', target); return; }
        if (ids[p.entityId] && !p.role) {
          warn('关系「' + label + '」两次连接实体「' + ent.name + '」但没有设置角色名，语义会不明确。', target);
        }
        ids[p.entityId] = true;
      });
      const seenAttr = {};
      rel.attributes.forEach(function (a) {
        const al = (a.name || '').trim().toLowerCase();
        if (!al) warn('关系「' + label + '」存在未命名的属性。', target);
        else if (seenAttr[al]) err('关系「' + label + '」中属性名重复：「' + a.name + '」。', target);
        else seenAttr[al] = true;
      });
      if (rel.participants.length === 2) {
        const m1 = rel.participants[0].max, m2 = rel.participants[1].max;
        const e1 = getEntity(model, rel.participants[0].entityId);
        const e2 = getEntity(model, rel.participants[1].entityId);
        if (e1 && e2 && e1.id === e2.id && m1 === '1' && m2 === '1') {
          info('关系「' + label + '」是自反 1:1 关系。', target);
        }
        if (m1 === '1' && m2 === '1' && rel.participants[0].min === 0 && rel.participants[1].min === 0) {
          info('关系「' + label + '」是可选 1:1 关系，生成的外键允许为空。', target);
        }
        if (m1 === 'N' && m2 === 'N' && rel.attributes.length) {
          info('关系「' + label + '」是 N:M 且有属性，属性会放入新建的关联表。', target);
        }
      }
      if (rel.participants.length > 2) {
        info('关系「' + label + '」是 ' + rel.participants.length + ' 元关系，将生成独立的关联表。', target);
      }
    });

    model.isas.forEach(function (isa) {
      const target = { ntype: 'isa', id: isa.id };
      if (!isa.parentId) { err('ISA 泛化没有设置父实体。', target); return; }
      if (!getEntity(model, isa.parentId)) { err('ISA 泛化的父实体不存在。', target); return; }
      if (!isa.childIds.length) { warn('ISA 泛化没有子实体。', target); return; }
      isa.childIds.forEach(function (cid) {
        const child = getEntity(model, cid);
        if (!child) { err('ISA 泛化引用了不存在的子实体。', target); return; }
        if (child.id === isa.parentId) err('ISA 泛化的父实体不能同时是子实体。', target);
        if (!child.attributes.length) info('ISA 子实体「' + child.name + '」没有自己的属性，生成的表只有继承的主键。', target);
      });
    });

    return out;
  }

  /* ---------------- 重构为关系模式 ---------------- */
  function build(model) {
    const notes = [];
    const warnings = [];
    const tables = [];
    const tableByEntity = {};
    const identifyingRels = {};
    const usedNames = {};

    function claimTableName(base) {
      let name = ident(base);
      if (!usedNames[name.toLowerCase()]) { usedNames[name.toLowerCase()] = true; return name; }
      let i = 2;
      while (usedNames[(name + '_' + i).toLowerCase()]) i += 1;
      const out = name + '_' + i;
      usedNames[out.toLowerCase()] = true;
      return out;
    }
    function dedupe(table) {
      const seen = {};
      table.columns.forEach(function (c) {
        let name = c.name; let i = 2;
        while (seen[name.toLowerCase()]) { name = c.name + '_' + i; i += 1; }
        seen[name.toLowerCase()] = true;
        c.name = name;
      });
      // 主键列排前面
      table.columns.sort(function (a, b) {
        const ap = a.pk ? 1 : 0, bp = b.pk ? 1 : 0;
        if (ap !== bp) return bp - ap;
        const af = a.fk ? 1 : 0, bf = b.fk ? 1 : 0;
        return bf - af;
      });
      table.columns.forEach(function (c) { if (c.pk) { c.nn = true; } });
    }

    /** 实体自身属性（不含多值），复合属性展开 */
    function entityColumns(ent) {
      const cols = [];
      ent.attributes.forEach(function (a) {
        if (a.multi) return;
        if (a.composite) {
          (a.children || []).forEach(function (c) {
            cols.push({ name: ident(a.name + '_' + c.name), type: inferType(c.name, c.type), key: false, fromComposite: a.name });
          });
          if (!(a.children || []).length) {
            warnings.push('复合属性「' + ent.name + '.' + a.name + '」没有子属性，已忽略。');
          }
        } else {
          cols.push({ name: ident(a.name), type: inferType(a.name, a.type), key: !!a.key });
        }
      });
      return cols;
    }

    function addColumn(table, col) {
      table.columns.push({
        name: ident(col.name), type: col.type || 'VARCHAR(255)',
        pk: !!col.pk, nn: !!col.nn, uniq: !!col.uniq,
        fk: col.fk || null, note: col.note || ''
      });
    }
    function addRelAttributes(table, rel) {
      rel.attributes.forEach(function (a) {
        if (a.multi) {
          addColumn(table, { name: a.name, type: 'TEXT', fk: null });
          notes.push('关系「' + rel.name + '」的多值属性「' + a.name + '」以 TEXT 存储。');
          return;
        }
        if (a.composite) {
          (a.children || []).forEach(function (c) {
            addColumn(table, { name: ident(a.name + '_' + c.name), type: inferType(c.name, c.type) });
          });
          return;
        }
        addColumn(table, { name: a.name, type: inferType(a.name, a.type) });
      });
    }
    function pkColumnsOf(table) { return table.columns.filter(function (c) { return c.pk; }); }

    /* ---- 1. 按父实体优先排序，逐个实体建表 ---- */
    const pm = parentMap(model);
    const entities = model.entities.slice().sort(function (a, b) {
      const da = entityDepth(model, a.id), db = entityDepth(model, b.id);
      if (da !== db) return da - db;
      if (a.weak !== b.weak) return a.weak ? 1 : -1;
      return 0;
    });

    entities.forEach(function (ent) {
      const table = {
        name: claimTableName(ent.name),
        sourceLabel: ent.weak ? '弱实体' : '实体',
        columns: [], entityId: ent.id
      };
      const cols = entityColumns(ent);
      const parentId = pm[ent.id];
      const parent = parentId ? getEntity(model, parentId) : null;
      let pkSet = false;

      if (ent.weak) {
        const ow = findOwner(model, ent);
        if (ow && tableByEntity[ow.owner.id]) {
          const ot = tableByEntity[ow.owner.id];
          const fks = pkColumnsOf(ot);
          if (!fks.length) warnings.push('所有者实体「' + ow.owner.name + '」没有主键，弱实体「' + ent.name + '」无法继承主键。');
          fks.forEach(function (pc) {
            addColumn(table, {
              name: util.lowerFirst(ot.name) + '_' + pc.name, type: pc.type, pk: true, nn: true,
              fk: { table: ot.name, column: pc.name }, note: '标识关系'
            });
          });
          const partials = cols.filter(function (c) { return c.key; });
          partials.forEach(function (c) { addColumn(table, { name: c.name, type: c.type, pk: true, nn: true, note: '部分键' }); });
          identifierRelsNote(identifyingRels, ow.rel.id);
          notes.push('弱实体「' + ent.name + '」：主键 = 所有者「' + ow.owner.name + '」主键 + 部分键（' +
            (partials.length ? partials.map(function (c) { return c.name; }).join(', ') : '无') + '）。');
          pkSet = true;
        } else {
          warnings.push('弱实体「' + ent.name + '」没有找到标识关系，将使用代理主键。');
        }
      } else if (parent && tableByEntity[parent.id]) {
        const pt = tableByEntity[parent.id];
        const fks = pkColumnsOf(pt);
        fks.forEach(function (pc) {
          addColumn(table, {
            name: pc.name, type: pc.type, pk: true, nn: true,
            fk: { table: pt.name, column: pc.name }, note: '继承自 ' + parent.name
          });
        });
        if (fks.length) {
          pkSet = true;
          notes.push('ISA：子实体「' + ent.name + '」继承父实体「' + parent.name + '」的主键作为自身主键（一表一类的映射）。');
        }
      }

      if (!pkSet) {
        const keyCols = cols.filter(function (c) { return c.key; });
        if (keyCols.length) {
          keyCols.forEach(function (c) { addColumn(table, { name: c.name, type: c.type, pk: true, nn: true }); });
          if (keyCols.length > 1) notes.push('实体「' + ent.name + '」使用复合主键：' + keyCols.map(function (c) { return c.name; }).join(', ') + '。');
        } else {
          const extFks = validFks(model, ent);
          if (extFks.length) {
            table._fkPk = extFks.map(function (x) {
              return { targetEntityId: x.target.id, refName: x.ref.name, refType: inferType(x.ref.name, x.ref.type) };
            });
          } else {
            addColumn(table, { name: 'id', type: 'INT', pk: true, nn: true });
            warnings.push('实体「' + ent.name + '」没有主键，已生成代理主键 id。');
            notes.push('实体「' + ent.name + '」缺少主键，使用代理键 id。');
          }
        }
        cols.forEach(function (c) {
          if (c.key) return;
          addColumn(table, { name: c.name, type: c.type });
        });
      } else {
        // 已有主键（弱实体 / 子实体）：其余属性全部作为普通列
        cols.forEach(function (c) {
          if (ent.weak && c.key) return;
          if (parent && !ent.weak) {
            addColumn(table, { name: c.name, type: c.type, uniq: !!c.key });
            if (c.key) notes.push('ISA 子实体「' + ent.name + '」的原主键「' + c.name + '」改为唯一约束。');
          } else {
            addColumn(table, { name: c.name, type: c.type });
          }
        });
      }

      dedupe(table);
      tables.push(table);
      tableByEntity[ent.id] = table;
    });

    /* ---- 2. 多值属性 -> 独立表 ---- */
    model.entities.forEach(function (ent) {
      const et = tableByEntity[ent.id];
      ent.attributes.forEach(function (a) {
        if (!a.multi) return;
        if (a.composite && (a.children || []).length) {
          const mt = { name: claimTableName(ent.name + '_' + a.name), sourceLabel: '多值复合属性', columns: [], entityId: ent.id };
          const fks = et ? pkColumnsOf(et) : [];
          fks.forEach(function (pc) {
            addColumn(mt, { name: util.lowerFirst(et.name) + '_' + pc.name, type: pc.type, pk: true, nn: true, fk: { table: et.name, column: pc.name } });
          });
          a.children.forEach(function (c) {
            addColumn(mt, { name: c.name, type: inferType(c.name, c.type), pk: true, nn: true });
          });
          dedupe(mt);
          tables.push(mt);
          notes.push('多值复合属性「' + ent.name + '.' + a.name + '」生成独立表 ' + mt.name + '。');
          return;
        }
        const mt = { name: claimTableName(ent.name + '_' + a.name), sourceLabel: '多值属性', columns: [], entityId: ent.id };
        const fks = et ? pkColumnsOf(et) : [];
        if (et) {
          fks.forEach(function (pc) {
            addColumn(mt, { name: util.lowerFirst(et.name) + '_' + pc.name, type: pc.type, pk: true, nn: true, fk: { table: et.name, column: pc.name } });
          });
        }
        addColumn(mt, { name: 'value', type: inferType(a.name, a.type), pk: true, nn: true });
        dedupe(mt);
        tables.push(mt);
        notes.push('多值属性「' + ent.name + '.' + a.name + '」生成独立表 ' + mt.name + '（主键 = 实体主键 + value）。');
      });
    });

    /* ---- 3. 关系 -> 外键 / 关联表 ---- */
    model.relationships.forEach(function (rel) {
      if (identifyingRels[rel.id]) {
        const weakPart = rel.participants.map(function (p) { return getEntity(model, p.entityId); })
          .find(function (e) { return e && e.weak; });
        const target = weakPart ? tableByEntity[weakPart.id] : null;
        if (target && rel.attributes.length) {
          addRelAttributes(target, rel);
          notes.push('标识关系「' + rel.name + '」的属性合并到弱实体「' + weakPart.name + '」的表中。');
        }
        dedupe(target || { columns: [] });
        return;
      }
      const parts = rel.participants.map(function (p) {
        const ent = getEntity(model, p.entityId);
        return { p: p, ent: ent, table: ent ? tableByEntity[ent.id] : null };
      }).filter(function (x) { return x.ent && x.table; });
      if (!parts.length) { warnings.push('关系「' + rel.name + '」没有有效参与实体，已跳过。'); return; }
      if (parts.length !== rel.participants.length) warnings.push('关系「' + rel.name + '」有参与实体不存在，已跳过缺失的部分。');

      if (parts.length === 1) {
        const a = parts[0];
        if (a.p.max === '1') {
          const fks = pkColumnsOf(a.table);
          if (!fks.length) { warnings.push('关系「' + rel.name + '」无法生成外键（目标表没有主键）。'); return; }
          fks.forEach(function (pc) {
            addColumn(a.table, {
              name: util.lowerFirst(a.table.name) + '_' + pc.name, type: pc.type,
              nn: a.p.min === 1, fk: { table: a.table.name, column: pc.name }, note: '一元关系 ' + rel.name
            });
          });
          addRelAttributes(a.table, rel);
          dedupe(a.table);
          notes.push('一元关系「' + rel.name + '」：在 ' + a.table.name + ' 中增加自引用外键。');
        } else {
          const jt = { name: claimTableName(rel.name), sourceLabel: '一元关系 ' + rel.name, columns: [] };
          const fks = pkColumnsOf(a.table);
          if (!fks.length) { warnings.push('关系「' + rel.name + '」无法生成关联表（目标表没有主键）。'); return; }
          const prefix = util.lowerFirst(a.table.name);
          fks.forEach(function (pc) {
            addColumn(jt, { name: prefix + '_1_' + pc.name, type: pc.type, pk: true, nn: a.p.min === 1, fk: { table: a.table.name, column: pc.name } });
            addColumn(jt, { name: prefix + '_2_' + pc.name, type: pc.type, pk: true, nn: false, fk: { table: a.table.name, column: pc.name } });
          });
          addRelAttributes(jt, rel);
          dedupe(jt);
          tables.push(jt);
          notes.push('一元 N 关系「' + rel.name + '」：生成关联表 ' + jt.name + '。');
        }
        return;
      }

      if (parts.length === 2) {
        const A = parts[0], B = parts[1];
        const pkA = pkColumnsOf(A.table), pkB = pkColumnsOf(B.table);
        const fkName = function (tbl, pc) { return util.lowerFirst(tbl.name) + '_' + pc.name; };
        if (A.p.max === '1' && B.p.max === '1') {
          // 1:1：外键放在完全参与（min=1）的一侧
          let holder = A, other = B;
          if (A.p.min === 1 && B.p.min !== 1) { holder = A; other = B; }
          else if (B.p.min === 1 && A.p.min !== 1) { holder = B; other = A; }
          const otherPk = pkColumnsOf(other.table);
          if (!otherPk.length) { warnings.push('关系「' + rel.name + '」无法生成外键（' + other.table.name + ' 没有主键）。'); return; }
          otherPk.forEach(function (pc) {
            addColumn(holder.table, {
              name: fkName(other.table, pc), type: pc.type, nn: holder.p.min === 1,
              uniq: true, fk: { table: other.table.name, column: pc.name }, note: '1:1 ' + rel.name
            });
          });
          addRelAttributes(holder.table, rel);
          dedupe(holder.table);
          notes.push('1:1 关系「' + rel.name + '」：外键放在 ' + holder.table.name + ' 中并加唯一约束，引用 ' + other.table.name + '。');
          return;
        }
        if (A.p.max === 'N' && B.p.max === 'N') {
          const jt = { name: claimTableName(rel.name), sourceLabel: 'N:M 关系 ' + rel.name, columns: [] };
          [A, B].forEach(function (side) {
            const pk = pkColumnsOf(side.table);
            if (!pk.length) { warnings.push('关系「' + rel.name + '」无法生成关联表（' + side.table.name + ' 没有主键）。'); return; }
            pk.forEach(function (pc) {
              addColumn(jt, {
                name: fkName(side.table, pc), type: pc.type, pk: true, nn: side.p.min === 1,
                fk: { table: side.table.name, column: pc.name }
              });
            });
          });
          const partial = [A, B].filter(function (s) { return s.p.min === 0; });
          addRelAttributes(jt, rel);
          dedupe(jt);
          tables.push(jt);
          notes.push('N:M 关系「' + rel.name + '」：生成关联表 ' + jt.name + '，主键由两端外键组成' +
            (rel.attributes.length ? '，关系属性作为表的列' : '') + '。');
          if (partial.length) {
            warnings.push('关系「' + rel.name + '」有参与端最小基数为 0，关联表主键列可能出现 NULL；若需要允许空值，请改用代理主键 + 唯一约束。');
          }
          return;
        }
        // 1:N：外键放在最大基数为 1 的一侧
        const one = A.p.max === '1' ? A : B;
        const many = one === A ? B : A;
        const manyPk = pkColumnsOf(many.table);
        if (!manyPk.length) { warnings.push('关系「' + rel.name + '」无法生成外键（' + many.table.name + ' 没有主键）。'); return; }
        if (one === many) { warnings.push('关系「' + rel.name + '」两端指向同一实体，跳过。'); return; }
        manyPk.forEach(function (pc) {
          addColumn(one.table, {
            name: fkName(many.table, pc), type: pc.type, nn: one.p.min === 1,
            fk: { table: many.table.name, column: pc.name }, note: '1:N ' + rel.name
          });
        });
        addRelAttributes(one.table, rel);
        dedupe(one.table);
        notes.push('1:N 关系「' + rel.name + '」：外键放在「' + one.ent.name + '」（最大基数为 1 的一侧），引用「' + many.ent.name + '」的主键' +
          (one.p.min === 1 ? '，且为 NOT NULL / ON DELETE CASCADE' : '，允许为空 / ON DELETE SET NULL') + '。');
        return;
      }

      // n 元关系
      const jt = { name: claimTableName(rel.name), sourceLabel: rel.participants.length + ' 元关系 ' + rel.name, columns: [] };
      parts.forEach(function (side) {
        const pk = pkColumnsOf(side.table);
        if (!pk.length) { warnings.push('关系「' + rel.name + '」无法生成关联表（' + side.table.name + ' 没有主键）。'); return; }
        pk.forEach(function (pc) {
          addColumn(jt, {
            name: util.lowerFirst(side.table.name) + '_' + pc.name, type: pc.type, pk: true,
            nn: side.p.min === 1, fk: { table: side.table.name, column: pc.name }
          });
        });
      });
      addRelAttributes(jt, rel);
      dedupe(jt);
      tables.push(jt);
      notes.push(rel.participants.length + ' 元关系「' + rel.name + '」：生成关联表 ' + jt.name + '，包含全部参与实体的外键。');
    });

    /* ---- 3b. 外键充当主键：把声明外键对应的列标记为主键 ---- */
    (function resolveFkPks() {
      const pending = entities.filter(function (e) {
        return tableByEntity[e.id] && tableByEntity[e.id]._fkPk;
      });
      let rounds = 0;
      while (pending.length && rounds < 6) {
        rounds += 1;
        let progressed = false;
        pending.forEach(function (ent) {
          const table = tableByEntity[ent.id];
          if (!table || !table._fkPk) return;
          const wanted = [];
          let unresolved = false;
          table._fkPk.forEach(function (x) {
            const tt = tableByEntity[x.targetEntityId];
            const pcs = tt ? pkColumnsOf(tt) : [];
            if (!pcs.length) unresolved = true;
            pcs.forEach(function (pc) { wanted.push({ table: tt, pc: pc }); });
          });
          if (!wanted.length) {
            if (!unresolved) { delete table._fkPk; }
            return;
          }
          let marked = 0;
          wanted.forEach(function (w) {
            table.columns.forEach(function (c) {
              if (c.fk && c.fk.table === w.table.name && c.fk.column === w.pc.name) {
                c.pk = true; c.nn = true; marked += 1;
              }
            });
          });
          if (!marked) {
            wanted.forEach(function (w) {
              addColumn(table, {
                name: util.lowerFirst(w.table.name) + '_' + w.pc.name, type: w.pc.type,
                pk: true, nn: true, fk: { table: w.table.name, column: w.pc.name }, note: '外键主键'
              });
            });
            marked = wanted.length;
          }
          const fkNames = wanted.map(function (w) { return w.table.name + '.' + w.pc.name; }).join(', ');
          notes.push(tr(
            '实体「' + ent.name + '」的主键由外键充当：' + fkNames + '。',
            'Entity "' + ent.name + '" uses its foreign key as the primary key: ' + fkNames + '.',
            'L’entità "' + ent.name + '" ha come chiave: ' + fkNames + '.'
          ));
          delete table._fkPk;
          dedupe(table);
          progressed = true;
        });
        if (!progressed) break;
      }
      pending.forEach(function (ent) {
        const table = tableByEntity[ent.id];
        if (!table || !table._fkPk) return;
        if (!pkColumnsOf(table).length) {
          addColumn(table, { name: 'id', type: 'INT', pk: true, nn: true });
          warnings.push('实体「' + ent.name + '」的外键主键目标不存在或没有主键，已生成代理主键 id。');
          dedupe(table);
        }
        delete table._fkPk;
      });
    })();

    /* ---- 4. 自检：外键目标是否存在 ---- */
    tables.forEach(function (t) {
      t.columns.forEach(function (c) {
        if (c.fk && !tables.some(function (x) { return x.name === c.fk.table; })) {
          warnings.push('表 ' + t.name + ' 的外键目标 ' + c.fk.table + ' 不存在。');
        }
      });
    });

    return { tables: tables, notes: notes, warnings: warnings };
  }

  function identifierRelsNote(store, relId) {
    store[relId] = true;
  }

  return { checks: checks, build: build, inferType: inferType, guessType: guessType };
})();
