# 食事・メニュー・食材管理システム設計案

## 概要

食事記録システムを拡張し、メニュー（カレー、みそ汁など）と食材を効率的に管理できるようにします。

## データ構造の設計

### 1. 階層構造

```
食事 (Meal)
├── メニュー (Menu/Dish) - 複数の食材で構成
│   ├── カレー
│   │   ├── 米 (100g)
│   │   ├── カレールー (1食分)
│   │   └── 野菜 (150g)
│   └── みそ汁
│       ├── みそ (大さじ1)
│       └── わかめ (5g)
└── 食材 (Food) - 直接食事に入れることも可能
    ├── りんご (1個)
    └── バナナ (1本)
```

### 2. データベース設計

#### 2.1 食材マスター (`foods`)

```python
class Food(Base):
    """食材マスターテーブル"""
    __tablename__ = "foods"
    
    id = UUID (PK)
    user_id = UUID (FK, nullable=True)  # null = 共通食材、値あり = ユーザー独自食材
    name = String(200)  # 食材名（例: "米"、"りんご"）
    category = String(50)  # カテゴリ（例: "穀物"、"果物"、"野菜"）
    description = Text  # 説明
    created_at = DateTime
    updated_at = DateTime
```

#### 2.2 食材の栄養成分 (`food_nutrition`)

```python
class FoodNutrition(Base):
    """食材の栄養成分（単位ごと）"""
    __tablename__ = "food_nutrition"
    
    id = UUID (PK)
    food_id = UUID (FK)
    unit = String(20)  # 単位（例: "100g", "1個", "1本", "大さじ1"）
    base_amount = Float  # 基準量（例: 100, 1, 1, 1）
    calories = Float  # カロリー
    protein = Float  # タンパク質 (g)
    carbs = Float  # 炭水化物 (g)
    fat = Float  # 脂質 (g)
    fiber = Float  # 食物繊維 (g, optional)
    sodium = Float  # ナトリウム (mg, optional)
    # その他の栄養成分...
    created_at = DateTime
    updated_at = DateTime
```

#### 2.3 メニューマスター (`menus`)

```python
class Menu(Base):
    """メニューマスターテーブル"""
    __tablename__ = "menus"
    
    id = UUID (PK)
    user_id = UUID (FK, nullable=True)  # null = 共通メニュー、値あり = ユーザー独自メニュー
    name = String(200)  # メニュー名（例: "カレー"、"みそ汁"）
    description = Text  # 説明
    image_url = String(500)  # 画像URL (optional)
    created_at = DateTime
    updated_at = DateTime
```

#### 2.4 メニューの食材構成 (`menu_ingredients`)

```python
class MenuIngredient(Base):
    """メニューと食材の関連（多対多）"""
    __tablename__ = "menu_ingredients"
    
    id = UUID (PK)
    menu_id = UUID (FK)
    food_id = UUID (FK)
    amount = Float  # 量（例: 100, 1, 150）
    unit = String(20)  # 単位（例: "g", "個", "大さじ")
    display_order = Integer  # 表示順序
    created_at = DateTime
    updated_at = DateTime
```

#### 2.5 メニューの栄養成分 (`menu_nutrition`)

```python
class MenuNutrition(Base):
    """メニューの栄養成分（単位ごと）"""
    __tablename__ = "menu_nutrition"
    
    id = UUID (PK)
    menu_id = UUID (FK)
    unit = String(20)  # 単位（例: "1食", "1人前", "100g"）
    base_amount = Float  # 基準量
    calories = Float  # カロリー
    protein = Float  # タンパク質 (g)
    carbs = Float  # 炭水化物 (g)
    fat = Float  # 脂質 (g)
    # その他の栄養成分...
    created_at = DateTime
    updated_at = DateTime
```

#### 2.6 食事記録の拡張 (`meal_records`)

```python
class MealRecord(Base):
    """食事記録（既存を拡張）"""
    __tablename__ = "meal_records"
    
    # 既存フィールド...
    id = UUID (PK)
    user_id = UUID (FK)
    recorded_at = DateTime
    meal_type = String(20)  # breakfast, lunch, dinner, snack
    
    # 変更: foods を items に拡張
    items = Column(JSONB, nullable=True)
    # items の構造:
    # [
    #   {
    #     "type": "menu" | "food",
    #     "id": UUID,  # menu_id または food_id
    #     "name": str,  # 表示用（例: "カレー"、"米"）
    #     "amount": float,  # 量（例: 1, 100）
    #     "unit": str,  # 単位（例: "1食", "100g"）
    #     "nutrition": {  # 計算済み栄養成分
    #       "calories": float,
    #       "protein": float,
    #       "carbs": float,
    #       "fat": float
    #     }
    #   },
    #   ...
    # ]
    
    # 既存フィールド...
    nutrition = JSONB  # 合計栄養成分（自動計算）
    notes = Text
    visibility = String(20)
    created_at = DateTime
    updated_at = DateTime
```

### 3. 栄養成分の計算ロジック

#### 3.1 食材の栄養成分計算

```python
def calculate_food_nutrition(food_id: UUID, amount: float, unit: str) -> NutritionInfo:
    """
    食材の栄養成分を計算
    
    Args:
        food_id: 食材ID
        amount: 量
        unit: 単位
    
    Returns:
        計算された栄養成分
    """
    # 1. food_nutrition から該当単位の栄養成分を取得
    nutrition = get_food_nutrition_by_unit(food_id, unit)
    
    # 2. 基準量に対する比率を計算
    ratio = amount / nutrition.base_amount
    
    # 3. 栄養成分を比率で掛け算
    return NutritionInfo(
        calories=nutrition.calories * ratio,
        protein=nutrition.protein * ratio,
        carbs=nutrition.carbs * ratio,
        fat=nutrition.fat * ratio,
        ...
    )
```

#### 3.2 メニューの栄養成分計算

```python
def calculate_menu_nutrition(menu_id: UUID, amount: float, unit: str) -> NutritionInfo:
    """
    メニューの栄養成分を計算（2つの方法）
    
    方法1: メニューの栄養成分テーブルから直接取得（推奨）
    - 事前に計算済みの栄養成分を使用（高速）
    
    方法2: 構成食材から計算（フォールバック）
    - menu_ingredients から食材を取得
    - 各食材の栄養成分を計算して合計
    """
    # 方法1を試す
    nutrition = get_menu_nutrition_by_unit(menu_id, unit)
    if nutrition:
        ratio = amount / nutrition.base_amount
        return nutrition * ratio
    
    # 方法2: 構成食材から計算
    ingredients = get_menu_ingredients(menu_id)
    total_nutrition = NutritionInfo()
    
    for ingredient in ingredients:
        # メニューの基準量に対する比率を計算
        menu_ratio = amount / get_menu_base_amount(menu_id, unit)
        # 食材の量を調整
        food_amount = ingredient.amount * menu_ratio
        food_nutrition = calculate_food_nutrition(
            ingredient.food_id, 
            food_amount, 
            ingredient.unit
        )
        total_nutrition += food_nutrition
    
    return total_nutrition
```

#### 3.3 食事の合計栄養成分計算

```python
def calculate_meal_nutrition(items: List[MealItem]) -> NutritionInfo:
    """
    食事の合計栄養成分を計算
    """
    total = NutritionInfo()
    
    for item in items:
        if item.type == "menu":
            nutrition = calculate_menu_nutrition(
                item.id, 
                item.amount, 
                item.unit
            )
        elif item.type == "food":
            nutrition = calculate_food_nutrition(
                item.id, 
                item.amount, 
                item.unit
            )
        total += nutrition
    
    return total
```

## UI設計

### 1. 食材・メニュー管理画面

#### 1.1 食材マスター管理
- 食材一覧（検索・フィルタ機能）
- 食材追加・編集
- 単位ごとの栄養成分登録
- 共通食材とユーザー独自食材の管理

#### 1.2 メニューマスター管理
- メニュー一覧（検索・フィルタ機能）
- メニュー追加・編集
- 構成食材の追加・編集
- 単位ごとの栄養成分登録（自動計算も可能）

### 2. 食事記録フォームの拡張

#### 2.1 アイテム追加UI

```
┌─────────────────────────────────────┐
│ 食事記録フォーム                    │
├─────────────────────────────────────┤
│ 日付: [2025-01-02]                 │
│ 食事タイプ: [朝食 ▼]               │
├─────────────────────────────────────┤
│ 追加するアイテム:                   │
│ ┌─────────────────────────────────┐ │
│ │ [メニュー ▼] [食材 ▼]          │ │
│ │ 検索: [____________]            │ │
│ │                                 │ │
│ │ 最近使用:                       │ │
│ │ [カレー] [みそ汁] [米] [りんご]│ │
│ │                                 │ │
│ │ カテゴリ:                       │ │
│ │ [主食] [主菜] [副菜] [果物]     │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 追加済みアイテム:                   │
│ ┌─────────────────────────────────┐ │
│ │ カレー                           │ │
│ │ 量: [1] [1食 ▼]                 │ │
│ │ 栄養: カロリー 500kcal           │ │
│ │       タンパク質 20g             │ │
│ │       [編集] [削除]              │ │
│ ├─────────────────────────────────┤ │
│ │ りんご                           │ │
│ │ 量: [1] [個 ▼]                  │ │
│ │ 栄養: カロリー 80kcal            │ │
│ │       [編集] [削除]              │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 合計栄養成分:                        │
│ カロリー: 580kcal                   │
│ タンパク質: 20g                     │
│ 炭水化物: 85g                       │
│ 脂質: 15g                          │
└─────────────────────────────────────┘
```

#### 2.2 メニュー詳細表示

メニューを選択した際に、構成食材を表示：

```
┌─────────────────────────────────────┐
│ カレー                              │
│ ─────────────────────────────────── │
│ 構成食材:                            │
│ • 米 (100g)                         │
│ • カレールー (1食分)                │
│ • 野菜 (150g)                       │
│ ─────────────────────────────────── │
│ 栄養成分 (1食あたり):                │
│ カロリー: 500kcal                   │
│ タンパク質: 20g                     │
│ 炭水化物: 60g                       │
│ 脂質: 15g                          │
└─────────────────────────────────────┘
```

## 実装の段階的アプローチ

### Phase 1: データベース設計とマイグレーション
1. 新しいテーブルの作成（foods, food_nutrition, menus, menu_ingredients, menu_nutrition）
2. meal_records テーブルの拡張（items カラムの追加）
3. 既存データの移行（foods → items への変換）

### Phase 2: バックエンドAPI
1. 食材マスターAPI（CRUD）
2. メニューマスターAPI（CRUD）
3. 栄養成分計算API
4. 食事記録APIの拡張

### Phase 3: フロントエンドUI
1. 食材・メニュー管理画面
2. 食事記録フォームの拡張
3. 栄養成分の自動計算と表示

### Phase 4: 最適化
1. 栄養成分のキャッシュ
2. よく使う食材・メニューのクイック選択
3. レコメンデーション機能

## メリット

1. **再利用性**: 食材・メニューをマスターとして管理し、何度でも使用可能
2. **正確性**: 単位ごとの栄養成分を定義することで、正確な計算が可能
3. **効率性**: メニューを登録しておくことで、毎回食材を入力する必要がない
4. **拡張性**: 新しい食材・メニューを簡単に追加可能
5. **柔軟性**: 食材を直接食事に入れることも、メニューとして登録することも可能

## 注意点

1. **データ整合性**: メニューの構成食材が変更された場合、既存の食事記録には影響しない（スナップショット方式）
2. **パフォーマンス**: 栄養成分の計算は可能な限りキャッシュする
3. **ユーザビリティ**: 食材・メニューの検索と選択を簡単にする

