import argparse
import csv
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path


def emit(payload, exit_code=0):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()
    raise SystemExit(exit_code)


def load_dotenv_file():
    candidates = [
        Path(os.getcwd()) / ".env",
        Path(__file__).resolve().parent.parent / ".env",
    ]

    for env_path in candidates:
        if not env_path.exists():
            continue

        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for raw_line in f:
                    line = raw_line.strip()

                    if not line or line.startswith("#"):
                        continue

                    if "=" not in line:
                        continue

                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip()

                    if not key:
                        continue

                    if (
                        (value.startswith('"') and value.endswith('"')) or
                        (value.startswith("'") and value.endswith("'"))
                    ):
                        value = value[1:-1]

                    if key not in os.environ:
                        os.environ[key] = value
        except Exception:
            pass


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--keyword", required=True)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--token", default=os.getenv("TWITTER_AUTH_TOKEN", ""))
    parser.add_argument("--tab", default="LATEST")
    parser.add_argument(
        "--timeout",
        type=int,
        default=int(os.getenv("X_WORKER_TIMEOUT_MS", "120000")),
        help="Timeout dalam milidetik",
    )
    return parser.parse_args()


def safe_int(value, default=0):
    try:
        if value is None or value == "":
            return default
        return int(float(str(value).replace(",", "").strip()))
    except Exception:
        return default


def parse_hashtags(text):
    if not text:
        return []
    return list(dict.fromkeys(re.findall(r"#([\w_]+)", str(text), flags=re.UNICODE)))


def pick_first(row, keys, default=None):
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return value
    return default


def normalize_row(row):
    text = pick_first(
        row,
        [
            "full_text",
            "text",
            "tweet_text",
            "content",
            "description",
        ],
        "",
    )

    username = pick_first(
        row,
        [
            "username",
            "screen_name",
            "user_screen_name",
            "author_username",
        ],
    )

    account_name = pick_first(
        row,
        [
            "name",
            "user_name",
            "author_name",
            "account_name",
        ],
    )

    tweet_id = pick_first(
        row,
        [
            "tweet_id",
            "id",
            "rest_id",
            "status_id",
            "conversation_id_str",
        ],
    )

    created_at = pick_first(
        row,
        [
            "created_at",
            "time",
            "date",
            "tweet_created_at",
        ],
    )

    like_count = safe_int(
        pick_first(
            row,
            [
                "favorite_count",
                "favourites_count",
                "likes",
                "like_count",
            ],
            0,
        )
    )

    reply_count = safe_int(
        pick_first(
            row,
            [
                "reply_count",
                "replies",
                "comment_count",
            ],
            0,
        )
    )

    retweet_count = safe_int(
        pick_first(
            row,
            [
                "retweet_count",
                "retweets",
                "share_count",
            ],
            0,
        )
    )

    quote_count = safe_int(
        pick_first(
            row,
            [
                "quote_count",
                "quotes",
            ],
            0,
        )
    )

    bookmark_count = pick_first(
        row,
        [
            "bookmark_count",
            "favorite_count_bookmark",
            "bookmarks",
        ],
    )
    bookmark_count = None if bookmark_count in (None, "") else safe_int(bookmark_count, 0)

    view_count = safe_int(
        pick_first(
            row,
            [
                "view_count",
                "views",
                "impression_count",
            ],
            0,
        )
    )

    media_url = pick_first(
        row,
        [
            "media_url",
            "image_url",
            "video_url",
            "thumbnail_url",
        ],
    )

    link_url = pick_first(
        row,
        [
            "tweet_url",
            "url",
            "link",
        ],
    )

    if not link_url and username and tweet_id:
        link_url = f"https://x.com/{username}/status/{tweet_id}"

    hashtags = parse_hashtags(text)

    return {
        "account_name": account_name,
        "account_username": username,
        "content": text,
        "post_time": created_at,
        "x_post_id": str(tweet_id) if tweet_id is not None else None,
        "link_url": link_url,
        "like_count": like_count,
        "share_count": retweet_count + quote_count,
        "favourite_count": bookmark_count,
        "view_count": view_count,
        "comment_count": reply_count,
        "hashtags": hashtags,
        "media_url": media_url,
        "raw_json": row,
    }


def validate_token(token):
    return isinstance(token, str) and len(token.strip()) > 10


def resolve_npx_command():
    if os.name == "nt":
        npx_cmd = shutil.which("npx.cmd")
        if npx_cmd:
            return [npx_cmd]

        npx = shutil.which("npx")
        if npx:
            return [npx]

        cmd_exe = shutil.which("cmd.exe")
        if cmd_exe:
            return [cmd_exe, "/c", "npx"]

        return None

    npx = shutil.which("npx")
    if npx:
        return [npx]

    return None


def safe_filename(keyword):
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "_", keyword.strip())
    cleaned = cleaned.strip("_") or "keyword"
    return f"{cleaned}_{int(time.time() * 1000)}.csv"


def main():
    load_dotenv_file()
    args = parse_args()

    token = str(args.token or "").strip()
    if not validate_token(token):
        emit(
            {
                "ok": False,
                "message": "TWITTER_AUTH_TOKEN belum diisi atau tidak valid.",
                "records": [],
            },
            exit_code=0,
        )

    npx_command = resolve_npx_command()
    if not npx_command:
        emit(
            {
                "ok": False,
                "message": "npx tidak ditemukan. Pastikan Node.js terinstall dan npx tersedia di PATH.",
                "records": [],
            },
            exit_code=0,
        )

    project_root = Path(os.getcwd())
    tweets_data_dir = project_root / "tweets-data"
    tweets_data_dir.mkdir(parents=True, exist_ok=True)

    output_filename = safe_filename(args.keyword)
    output_file = tweets_data_dir / output_filename

    command = npx_command + [
        "-y",
        "tweet-harvest@2.6.1",
        "-o",
        output_filename,
        "-s",
        args.keyword,
        "--tab",
        args.tab,
        "-l",
        str(args.limit),
        "--token",
        token,
    ]

    try:
        proc = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=True,
            cwd=str(project_root),
            shell=False,
            timeout=max(1, int(args.timeout / 1000)),
        )
    except subprocess.TimeoutExpired as exc:
        emit(
            {
                "ok": False,
                "timeout": True,
                "message": f"tweet-harvest timeout setelah {args.timeout} ms.",
                "stdout": exc.stdout or "",
                "stderr": exc.stderr or "",
                "records": [],
            },
            exit_code=0,
        )
    except FileNotFoundError as exc:
        emit(
            {
                "ok": False,
                "message": f"Executable tidak ditemukan: {str(exc)}",
                "records": [],
            },
            exit_code=0,
        )
    except subprocess.CalledProcessError as exc:
        emit(
            {
                "ok": False,
                "message": "tweet-harvest gagal dijalankan.",
                "stdout": exc.stdout,
                "stderr": exc.stderr,
                "records": [],
            },
            exit_code=0,
        )
    except Exception as exc:
        emit(
            {
                "ok": False,
                "message": f"Worker Python gagal: {str(exc)}",
                "records": [],
            },
            exit_code=0,
        )

    records = []

    if output_file.exists():
        try:
            with open(output_file, "r", encoding="utf-8-sig", newline="") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    records.append(normalize_row(row))
        except Exception as exc:
            emit(
                {
                    "ok": False,
                    "message": f"Gagal membaca CSV hasil crawl: {str(exc)}",
                    "stdout": proc.stdout if "proc" in locals() else "",
                    "stderr": proc.stderr if "proc" in locals() else "",
                    "records": [],
                },
                exit_code=0,
            )

    emit(
        {
            "ok": True,
            "keyword": args.keyword,
            "count": len(records),
            "records": records,
            "output_file": str(output_file),
            "stdout": proc.stdout if "proc" in locals() else "",
            "stderr": proc.stderr if "proc" in locals() else "",
        },
        exit_code=0,
    )


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:
        emit(
            {
                "ok": False,
                "message": f"Unhandled worker error: {str(exc)}",
                "records": [],
            },
            exit_code=0,
        )