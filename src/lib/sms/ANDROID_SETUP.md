# Android SMS Reader — Native Setup

The TypeScript bridge in `src/lib/sms/native.ts` registers a Capacitor plugin
called `SmsReader`. To make it work in the Android app you need a tiny native
module — Capacitor cannot read SMS by itself.

## 1. Permissions

Add to `android/app/src/main/AndroidManifest.xml` inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.RECEIVE_SMS" />
```

## 2. Plugin (Java)

Two files. Put them under `android/app/src/main/java/app/lovable/sms/`.

### 2a. `SmsReaderPlugin.java`

```java
package app.lovable.sms;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SmsReader")
public class SmsReaderPlugin extends Plugin {

  private BroadcastReceiver receiver;

  @PluginMethod
  public void checkPermission(PluginCall call) {
    boolean granted = ContextCompat.checkSelfPermission(getContext(),
        Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;
    JSObject ret = new JSObject(); ret.put("granted", granted); call.resolve(ret);
  }

  @PluginMethod
  public void requestPermission(PluginCall call) {
    ActivityCompat.requestPermissions(getActivity(),
      new String[]{ Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS }, 4242);
    checkPermission(call);
  }

  @PluginMethod
  public void readInbox(PluginCall call) {
    Long since = call.getLong("sinceEpochMs", 0L);
    int max = call.getInt("maxCount", 500);
    JSArray out = new JSArray();
    Cursor c = getContext().getContentResolver().query(
      Uri.parse("content://sms/inbox"),
      new String[]{ "_id", "address", "body", "date" },
      since > 0 ? "date >= ?" : null,
      since > 0 ? new String[]{ String.valueOf(since) } : null,
      "date DESC");
    if (c != null) {
      int i = 0;
      while (c.moveToNext() && i < max) {
        JSObject o = new JSObject();
        o.put("id", c.getString(0));
        o.put("address", c.getString(1));
        o.put("body", c.getString(2));
        o.put("date", c.getLong(3));
        out.put(o); i++;
      }
      c.close();
    }
    JSObject ret = new JSObject(); ret.put("messages", out); call.resolve(ret);
  }

  @PluginMethod
  public void startListener(PluginCall call) {
    if (receiver != null) {
      JSObject r = new JSObject(); r.put("started", true); call.resolve(r); return;
    }
    receiver = new BroadcastReceiver() {
      @Override
      public void onReceive(Context context, Intent intent) {
        if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;
        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        // Group multipart SMS by sender so we don't fire one event per segment.
        java.util.Map<String, StringBuilder> bodies = new java.util.LinkedHashMap<>();
        java.util.Map<String, Long> dates = new java.util.HashMap<>();
        SmsMessage[] msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent);
        if (msgs == null) return;
        for (SmsMessage m : msgs) {
          String addr = m.getOriginatingAddress();
          if (addr == null) continue;
          StringBuilder sb = bodies.get(addr);
          if (sb == null) { sb = new StringBuilder(); bodies.put(addr, sb); }
          sb.append(m.getMessageBody() == null ? "" : m.getMessageBody());
          dates.put(addr, m.getTimestampMillis());
        }
        for (java.util.Map.Entry<String, StringBuilder> e : bodies.entrySet()) {
          JSObject data = new JSObject();
          data.put("id", String.valueOf(dates.get(e.getKey())) + "-" + e.getKey());
          data.put("address", e.getKey());
          data.put("body", e.getValue().toString());
          data.put("date", dates.get(e.getKey()));
          notifyListeners("smsReceived", data);
        }
      }
    };
    IntentFilter filter = new IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION);
    filter.setPriority(999);
    getContext().registerReceiver(receiver, filter);
    JSObject ret = new JSObject(); ret.put("started", true); call.resolve(ret);
  }

  @PluginMethod
  public void stopListener(PluginCall call) {
    if (receiver != null) {
      try { getContext().unregisterReceiver(receiver); } catch (Exception ignored) {}
      receiver = null;
    }
    JSObject ret = new JSObject(); ret.put("stopped", true); call.resolve(ret);
  }

  @Override
  protected void handleOnDestroy() {
    if (receiver != null) {
      try { getContext().unregisterReceiver(receiver); } catch (Exception ignored) {}
      receiver = null;
    }
  }
}
```

### 2b. Register in `MainActivity.java`

```java
import app.lovable.sms.SmsReaderPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(android.os.Bundle savedInstanceState) {
    registerPlugin(SmsReaderPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
```

### 2c. Notes

- The receiver is registered at runtime (not in the manifest) so it only runs while the app is in the foreground. That's intentional — it avoids Android's restrictions on implicit `SMS_RECEIVED` manifest receivers and the Play Store's `SmsReceiver` policy review for background SMS apps.
- For background delivery while the app is closed, wrap this plugin in a foreground `Service` started from `startListener` and stopped from `stopListener`, and add a persistent notification. Most users won't need this — opening the app once a day triggers the live listener plus a `scanInbox` catch-up.

## 3. Play Store

`READ_SMS` is restricted. Submit a Permissions Declaration explaining that the
app reads bank/card transaction SMS to track personal expenses, on user opt-in,
with data staying in the user's own account.

## 4. Build

```
npx cap sync android
npx cap open android
```

## 5. Google sign-in deep link

If the Android app shows a 404 after tapping **Continue with Google**, add this
intent filter inside the existing `<activity ...>` block in
`android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data
    android:scheme="app.lovable.e9a7d0885b7d43b1a87e025dea4b76fa"
    android:host="auth"
    android:path="/callback" />
</intent-filter>
```

Then run:

```
npx cap sync android
```

This is a one-time native Android setup step. Future Lovable UI/code updates do
not require repeating it unless the native Android folder is recreated.