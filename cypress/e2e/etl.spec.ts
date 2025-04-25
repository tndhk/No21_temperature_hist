/// <reference types="cypress" />

describe('ETL Button', () => {
  beforeEach(() => {
    // テスト用にAPI呼び出しをスタブ
    cy.intercept('POST', '/api/etl', {
      statusCode: 200,
      body: { success: true, detail: { message: '初期データ取得完了' } },
    }).as('etlCall');
    cy.visit('/');
  });

  it('トリガー実行後に完了メッセージを表示する', () => {
    cy.get('button').contains('データ取得＆ETL実行').click();
    cy.wait('@etlCall');
    cy.contains('完了: 初期データ取得完了');
  });

  it('ロード中は処理中...を表示する', () => {
    // 遅延レスポンスをシミュレート
    cy.intercept('POST', '/api/etl', (req) => {
      req.reply({
        statusCode: 200,
        body: { success: true, detail: { message: 'ok' } },
        delayMs: 500,
      });
    }).as('etlCallDelayed');

    cy.get('button').contains('データ取得＆ETL実行').click();
    cy.contains('処理中...');
    cy.wait('@etlCallDelayed');
    cy.contains('完了: ok');
  });
}); 