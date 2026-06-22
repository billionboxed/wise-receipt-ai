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

Create `android/app/src/main/java/app/lovable/sms/SmsReaderPlugin.java`:

```java
package app.lovable.sms;

import android.Manifest;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
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
    // Register a BroadcastReceiver for android.provider.Telephony.SMS_RECEIVED
    // and notifyListeners("smsReceived", data) on each message.
    JSObject ret = new JSObject(); ret.put("started", true); call.resolve(ret);
  }

  @PluginMethod
  public void stopListener(PluginCall call) {
    JSObject ret = new JSObject(); ret.put("stopped", true); call.resolve(ret);
  }
}
```

Register it in `MainActivity.java`:

```java
registerPlugin(SmsReaderPlugin.class);
```

## 3. Play Store

`READ_SMS` is restricted. Submit a Permissions Declaration explaining that the
app reads bank/card transaction SMS to track personal expenses, on user opt-in,
with data staying in the user's own account.

## 4. Build

```
npx cap sync android
npx cap open android
```