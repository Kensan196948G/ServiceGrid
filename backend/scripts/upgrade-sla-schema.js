/**
 * データベーススキーマアップグレード: SLA テーブル拡張
 * 
 * 基本的なslas テーブルを詳細なSLA管理に対応する拡張版に更新します
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// データベース接続
const dbPath = path.join(__dirname, '..', process.env.DB_PATH || 'db/itsm.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔄 SLAテーブルスキーマアップグレード開始...');
console.log(`データベース: ${dbPath}`);

db.serialize(() => {
  // 外部キー制約を一時的に無効化
  db.run('PRAGMA foreign_keys = OFF');

  // 現在のslas テーブルを確認
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='slas'", (err, row) => {
    if (err) {
      console.error('エラー:', err);
      return;
    }

    console.log('現在のslas テーブル構造:');
    console.log(row ? row.sql : 'テーブルが存在しません');

    // 既存データを一時保存
    db.all('SELECT * FROM slas', (err, existingData) => {
      if (err) {
        console.error('既存データ取得エラー:', err);
        return;
      }

      console.log(`${existingData.length}件の既存SLAデータを発見`);

      // 古いテーブルをバックアップ
      db.run(`CREATE TABLE IF NOT EXISTS slas_backup_${Date.now()} AS SELECT * FROM slas`, (err) => {
        if (err) {
          console.error('バックアップエラー:', err);
          return;
        }

        console.log('✅ 既存データのバックアップ完了');

        // 古いテーブルを削除
        db.run('DROP TABLE IF EXISTS slas', (err) => {
          if (err) {
            console.error('テーブル削除エラー:', err);
            return;
          }

          // 拡張版slas テーブルを作成
          const createTableQuery = `
            CREATE TABLE slas (
              sla_id INTEGER PRIMARY KEY AUTOINCREMENT,
              service_name TEXT NOT NULL,
              metric_name TEXT NOT NULL,
              metric_type TEXT NOT NULL,
              target_value REAL NOT NULL,
              actual_value REAL,
              unit TEXT,
              measurement_period TEXT DEFAULT 'Monthly',
              measurement_date DATE NOT NULL,
              status TEXT DEFAULT 'Met',
              breach_reason TEXT,
              corrective_action TEXT,
              responsible_team TEXT,
              created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
              created_by_user_id INTEGER,
              
              -- 制約
              CONSTRAINT slas_metric_type_check CHECK (metric_type IN ('Availability', 'Performance', 'Response Time', 'Resolution Time', 'Quality')),
              CONSTRAINT slas_status_check CHECK (status IN ('Met', 'Breached', 'At Risk', 'Unknown')),
              CONSTRAINT slas_measurement_period_check CHECK (measurement_period IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually')),
              FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
            )
          `;

          db.run(createTableQuery, (err) => {
            if (err) {
              console.error('新テーブル作成エラー:', err);
              return;
            }

            console.log('✅ 拡張版SLAテーブル作成完了');

            // インデックス作成
            const indexes = [
              'CREATE INDEX idx_slas_service_name ON slas(service_name)',
              'CREATE INDEX idx_slas_metric_type ON slas(metric_type)',
              'CREATE INDEX idx_slas_measurement_date ON slas(measurement_date)',
              'CREATE INDEX idx_slas_status ON slas(status)'
            ];

            let indexCount = 0;
            indexes.forEach(indexQuery => {
              db.run(indexQuery, (err) => {
                if (err) {
                  console.error('インデックス作成エラー:', err);
                } else {
                  indexCount++;
                  if (indexCount === indexes.length) {
                    console.log('✅ インデックス作成完了');
                    
                    // 更新日時自動更新トリガー作成
                    const triggerQuery = `
                      CREATE TRIGGER update_slas_timestamp 
                        AFTER UPDATE ON slas
                        BEGIN
                          UPDATE slas SET updated_date = CURRENT_TIMESTAMP WHERE sla_id = NEW.sla_id;
                        END
                    `;

                    db.run(triggerQuery, (err) => {
                      if (err) {
                        console.error('トリガー作成エラー:', err);
                      } else {
                        console.log('✅ 更新日時トリガー作成完了');
                      }

                      // 既存データを新しい形式に変換してマイグレーション
                      if (existingData.length > 0) {
                        console.log('📦 既存データのマイグレーション中...');
                        
                        let migrationCount = 0;
                        existingData.forEach(oldSla => {
                          // 古いデータを新しい形式に変換
                          const newSla = {
                            service_name: oldSla.service_name || 'Legacy Service',
                            metric_name: 'Legacy Metric',
                            metric_type: 'Availability', // デフォルト値
                            target_value: oldSla.target_value || 99.0,
                            actual_value: oldSla.actual_value,
                            unit: '%', // デフォルト値
                            measurement_period: 'Monthly', // デフォルト値
                            measurement_date: oldSla.measurement_date || new Date().toISOString().split('T')[0],
                            status: oldSla.status || 'Unknown',
                            created_date: oldSla.created_date || new Date().toISOString()
                          };

                          const insertQuery = `
                            INSERT INTO slas (
                              service_name, metric_name, metric_type, target_value, actual_value,
                              unit, measurement_period, measurement_date, status, created_date
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                          `;

                          db.run(insertQuery, [
                            newSla.service_name, newSla.metric_name, newSla.metric_type,
                            newSla.target_value, newSla.actual_value, newSla.unit,
                            newSla.measurement_period, newSla.measurement_date,
                            newSla.status, newSla.created_date
                          ], function(err) {
                            if (err) {
                              console.error('データマイグレーションエラー:', err);
                            } else {
                              migrationCount++;
                              if (migrationCount === existingData.length) {
                                console.log(`✅ ${migrationCount}件のデータマイグレーション完了`);
                                
                                // サンプルデータを追加
                                insertSampleData();
                              }
                            }
                          });
                        });
                      } else {
                        // 既存データがない場合、サンプルデータのみ追加
                        insertSampleData();
                      }
                    });
                  }
                }
              });
            });
          });
        });
      });
    });
  });

  // サンプルデータ挿入関数
  function insertSampleData() {
    console.log('📝 サンプルSLAデータを追加中...');
    
    const sampleSLAs = [
      {
        service_name: 'Webサービス',
        metric_name: 'システム可用性',
        metric_type: 'Availability',
        target_value: 99.9,
        actual_value: 99.95,
        unit: '%',
        measurement_period: 'Monthly',
        measurement_date: new Date().toISOString().split('T')[0],
        status: 'Met',
        responsible_team: 'インフラチーム',
        created_by_user_id: 1
      },
      {
        service_name: 'メールサービス',
        metric_name: 'レスポンス時間',
        metric_type: 'Response Time',
        target_value: 2.0,
        actual_value: 1.8,
        unit: '秒',
        measurement_period: 'Monthly',
        measurement_date: new Date().toISOString().split('T')[0],
        status: 'Met',
        responsible_team: 'メールチーム',
        created_by_user_id: 1
      },
      {
        service_name: 'ファイルサーバー',
        metric_name: 'システム可用性',
        metric_type: 'Availability',
        target_value: 99.5,
        actual_value: 98.2,
        unit: '%',
        measurement_period: 'Monthly',
        measurement_date: new Date().toISOString().split('T')[0],
        status: 'Breached',
        breach_reason: '計画外メンテナンスによる停止',
        corrective_action: 'インフラ監視強化とバックアップシステム構築',
        responsible_team: 'ストレージチーム',
        created_by_user_id: 1
      }
    ];

    let sampleCount = 0;
    sampleSLAs.forEach(sla => {
      const insertQuery = `
        INSERT INTO slas (
          service_name, metric_name, metric_type, target_value, actual_value,
          unit, measurement_period, measurement_date, status, breach_reason,
          corrective_action, responsible_team, created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(insertQuery, [
        sla.service_name, sla.metric_name, sla.metric_type,
        sla.target_value, sla.actual_value, sla.unit,
        sla.measurement_period, sla.measurement_date, sla.status,
        sla.breach_reason, sla.corrective_action, sla.responsible_team,
        sla.created_by_user_id
      ], function(err) {
        if (err) {
          console.error('サンプルデータ挿入エラー:', err);
        } else {
          sampleCount++;
          if (sampleCount === sampleSLAs.length) {
            console.log(`✅ ${sampleCount}件のサンプルSLAデータを追加完了`);
            
            // 外部キー制約を再有効化
            db.run('PRAGMA foreign_keys = ON', (err) => {
              if (err) {
                console.error('外部キー制約有効化エラー:', err);
              } else {
                console.log('✅ 外部キー制約を再有効化');
              }
              
              // 最終確認
              db.get('SELECT COUNT(*) as count FROM slas', (err, result) => {
                if (err) {
                  console.error('確認エラー:', err);
                } else {
                  console.log(`📊 総SLAレコード数: ${result.count}`);
                  console.log('🎉 SLAテーブルスキーマアップグレード完了!');
                  console.log('\n新しいSLAテーブルの機能:');
                  console.log('- 詳細なメトリック種別管理');
                  console.log('- 測定期間の設定');
                  console.log('- SLA違反状況追跡');
                  console.log('- 是正措置記録');
                  console.log('- 責任者管理');
                  console.log('- 外部キー制約によるデータ整合性');
                }
                
                db.close();
              });
            });
          }
        }
      });
    });
  }
});