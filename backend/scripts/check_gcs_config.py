#!/usr/bin/env python3
"""
Check GCS configuration and environment variables.

Usage:
    python scripts/check_gcs_config.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load environment variables from .env file (ignore if file doesn't exist)
try:
    load_dotenv(override=False)
except Exception:
    # Ignore errors if .env file doesn't exist
    pass


def check_environment_variables():
    """Check if required environment variables are set."""
    print("=" * 60)
    print("GCS環境変数チェック")
    print("=" * 60)

    required_vars = {
        "GCS_BUCKET_NAME": os.getenv("GCS_BUCKET_NAME"),
        "GCS_PROJECT_ID": os.getenv("GCS_PROJECT_ID"),
        "GOOGLE_APPLICATION_CREDENTIALS": os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
    }

    all_set = True
    for var_name, var_value in required_vars.items():
        if var_value:
            print(f"✅ {var_name}: {var_value}")
        else:
            print(f"❌ {var_name}: 未設定")
            all_set = False

    print()

    if not all_set:
        print("⚠️  一部の環境変数が設定されていません。")
        print("   backend/.env ファイルを確認してください。")
        return False

    return True


def check_service_account_file():
    """Check if service account key file exists."""
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

    if not creds_path:
        print("⚠️  GOOGLE_APPLICATION_CREDENTIALS が設定されていません。")
        print(
            "   Cloud Runのデフォルトサービスアカウントを使用する場合は問題ありません。"
        )
        return True

    print("=" * 60)
    print("サービスアカウントキーファイルチェック")
    print("=" * 60)

    # Check if path is absolute or relative
    if os.path.isabs(creds_path):
        file_path = Path(creds_path)
    else:
        # Relative to backend directory
        backend_dir = Path(__file__).parent.parent
        file_path = backend_dir / creds_path

    if file_path.exists():
        print(f"✅ ファイルが見つかりました: {file_path}")

        # Check file size (should be reasonable)
        file_size = file_path.stat().st_size
        if file_size > 0 and file_size < 10000:  # Less than 10KB is suspicious
            print(
                f"⚠️  ファイルサイズが小さいです ({file_size} bytes)。内容を確認してください。"
            )
        else:
            print(f"   ファイルサイズ: {file_size} bytes")

        return True
    else:
        print(f"❌ ファイルが見つかりません: {file_path}")
        print(f"   設定されたパス: {creds_path}")
        return False


def check_gcs_connection():
    """Check if GCS connection can be established."""
    print("=" * 60)
    print("GCS接続チェック")
    print("=" * 60)

    try:
        from app.services.storage_service import storage_service

        if storage_service.is_available():
            print("✅ GCS Storage service is available")
            print(f"   バケット名: {storage_service.bucket_name}")
            print(f"   プロジェクトID: {storage_service.project_id}")

            # Try to access bucket
            try:
                bucket = storage_service.bucket
                if bucket.exists():
                    print("✅ バケットにアクセスできました")
                else:
                    print("❌ バケットが存在しません")
                    return False
            except Exception as e:
                print(f"❌ バケットへのアクセスに失敗: {e}")
                return False

            return True
        else:
            print("❌ GCS Storage service is not available")
            print("   環境変数を確認してください。")
            return False

    except ImportError as e:
        print(f"❌ モジュールのインポートに失敗: {e}")
        print("   pip install google-cloud-storage Pillow を実行してください。")
        return False
    except Exception as e:
        print(f"❌ 予期しないエラー: {e}")
        return False


def main():
    """Main function."""
    print("\n")

    # Check environment variables
    env_ok = check_environment_variables()
    print()

    # Check service account file (if GOOGLE_APPLICATION_CREDENTIALS is set)
    if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        file_ok = check_service_account_file()
        print()
    else:
        print("ℹ️  GOOGLE_APPLICATION_CREDENTIALS が設定されていないため、")
        print("   サービスアカウントキーファイルのチェックをスキップします。")
        print("   （Cloud Runのデフォルトサービスアカウントを使用する場合）")
        file_ok = True
        print()

    # Check GCS connection
    if env_ok:
        connection_ok = check_gcs_connection()
    else:
        print("⚠️  環境変数が設定されていないため、接続チェックをスキップします。")
        connection_ok = False

    print()
    print("=" * 60)
    print("チェック結果")
    print("=" * 60)

    if env_ok and file_ok and connection_ok:
        print("✅ すべてのチェックが成功しました！")
        print("   GCS画像アップロード機能が使用可能です。")
        return 0
    else:
        print("❌ 一部のチェックが失敗しました。")
        print("   上記のメッセージを確認して、設定を修正してください。")
        print("\n詳細は docs/GCS_ENVIRONMENT_SETUP.md を参照してください。")
        return 1


if __name__ == "__main__":
    sys.exit(main())
